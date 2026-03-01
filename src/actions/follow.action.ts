"use server";

import { prisma } from "@/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * FOLLOW USER
 *
 * PURPOSE: Allow users to follow other users
 *
 * ARCHITECTURE NOTES:
 * - Creates a Follows relationship between two users
 * - Enables social graph features (followers/following counts)
 * - Creates FOLLOW notification for the user being followed
 * - Prevents self-follow with validation
 *
 * WHY THIS PATTERN:
 * - Many-to-many relationship requires separrate model
 * - Tracks creation date for sorting by "most recently followed"
 * - Composite key prevents duplicate follows automatically
 *
 * @param followingId - Clerk ID of user to follow
 * @returns Follow relationship or error
 */
export async function followUser(followingId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in to follow");
    }

    // Prevent self-follow
    if (userId === followingId) {
      throw new Error("You cannot follow yourself");
    }

    // Verify user being followed exists
    const userToFollow = await prisma.user.findUnique({
      where: { clerkId: followingId },
    });

    if (!userToFollow) {
      throw new Error("User not found");
    }

    // Check if already following (idempotency)
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      return { success: false, message: "Already following user" };
    }

    // Create follow relationship
    const follow = await prisma.follows.create({
      data: {
        followerId: userId,
        followingId,
      },
    });

    // Create notification for user being followed
    await prisma.notification.create({
      data: {
        userId: followingId,
        creatorId: userId,
        type: "FOLLOW",
      },
    });

    // Invalidate profiles and discovery pages
    revalidatePath(`/profile/${userToFollow.username}`);
    revalidatePath("/explore");
    revalidatePath("/");

    return { success: true, follow };
  } catch (error: any) {
    console.error("Error following user:", error?.message);
    throw new Error(`Failed to follow user: ${error?.message}`);
  }
}

/**
 * UNFOLLOW USER
 *
 * PURPOSE: Allow users to stop following other users
 *
 * @param followingId - Clerk ID of user to unfollow
 * @returns Confirmation of unfollow
 */
export async function unfollowUser(followingId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in");
    }

    // Delete follow relationship
    const deletedFollow = await prisma.follows
      .delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId,
          },
        },
      })
      .catch(() => null);

    if (!deletedFollow) {
      return { success: false, message: "Not following user" };
    }

    // Fetch user being unfollowed to get username for revalidation
    const user = await prisma.user.findUnique({
      where: { clerkId: followingId },
    });

    // Invalidate related pages
    if (user) {
      revalidatePath(`/profile/${user.username}`);
    }
    revalidatePath("/explore");
    revalidatePath("/");

    return { success: true, message: "User unfollowed" };
  } catch (error: any) {
    console.error("Error unfollowing user:", error?.message);
    throw new Error(`Failed to unfollow user: ${error?.message}`);
  }
}

/**
 * CHECK IF FOLLOWING
 *
 * PURPOSE: Determine if current user follows a specific user
 *
 * ARCHITECTURE NOTES:
 * - Used to show "Following" or "Follow" button
 * - Call once when user component mounts
 *
 * @param targetUserId - Clerk ID of user to check
 * @returns Boolean indicating follow status
 */
export async function isFollowing(targetUserId: string): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return false; // Unauthenticated users aren't following anyone
    }

    const follow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    return !!follow;
  } catch (error: any) {
    console.error("Error checking follow status:", error?.message);
    return false;
  }
}

/**
 * GET USER FOLLOWERS
 *
 * PURPOSE: Fetch all users following a specific user
 *
 * ARCHITECTURE NOTES:
 * - Used on profile pages to show "Followers" section
 * - Returns user info for display (name, avatar, username)
 *
 * @param userId - Clerk ID of user to fetch followers for
 * @returns Array of follower users
 */
export async function getUserFollowers(userId: string) {
  try {
    const follows = await prisma.follows.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return follows.map((f) => f.follower);
  } catch (error: any) {
    console.error("Error fetching followers:", error?.message);
    throw new Error(`Failed to fetch followers: ${error?.message}`);
  }
}

/**
 * GET USER FOLLOWING
 *
 * PURPOSE: Fetch all users that a specific user follows
 *
 * ARCHITECTURE NOTES:
 * - Used on profile pages to show "Following" section
 * - Returns user info for display
 *
 * @param userId - Clerk ID of user to fetch following list for
 * @returns Array of users being followed
 */
export async function getUserFollowing(userId: string) {
  try {
    const follows = await prisma.follows.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return follows.map((f) => f.following);
  } catch (error: any) {
    console.error("Error fetching following:", error?.message);
    throw new Error(`Failed to fetch following: ${error?.message}`);
  }
}

/**
 * GET SUGGESTED USERS (WHO TO FOLLOW)
 *
 * PURPOSE: Recommend users that current user might want to follow
 *
 * ARCHITECTURE NOTES:
 * - Algorithm: Users who are followed by people you follow (mutual connections)
 * - Excludes already-followed users and self
 * - Limited to 5 suggestions for sidebar display
 *
 * WHY THIS ALGORITHM:
 * - "Friends of friends" are likely relevant connections
 * - Reduces cold-start problem in social graphs
 * - Encourages network growth
 *
 * @returns Suggested users to follow
 */
export async function getSuggestedUsers(limit: number = 5) {
  try {
    const { userId } = await auth();
    if (!userId) {
      // Return popular users if not authenticated
      const popularUsers = await prisma.user.findMany({
        take: limit,
        orderBy: {
          followers: {
            _count: "desc",
          },
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          _count: {
            select: { followers: true },
          },
        },
      });
      return popularUsers;
    }

    // Get users that the current user follows
    const userFollowing = await prisma.follows.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = userFollowing.map((f) => f.followingId);

    // Get users followed by people you follow (mutual connections)
    const suggestedUsers = await prisma.user.findMany({
      where: {
        AND: [
          {
            // Exclude self
            clerkId: { not: userId },
          },
          {
            // Exclude already following
            followers: {
              none: { followerId: userId },
            },
          },
          {
            // Include users followed by your follows
            followers: {
              some: {
                followerId: {
                  in: followingIds.length > 0 ? followingIds : [""],
                },
              },
            },
          },
        ],
      },
      take: limit,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        _count: {
          select: { followers: true },
        },
      },
    });

    return suggestedUsers;
  } catch (error: any) {
    console.error("Error fetching suggested users:", error?.message);
    throw new Error(`Failed to fetch suggestions: ${error?.message}`);
  }
}
