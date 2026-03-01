"use server";

import { prisma } from "@/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * LIKE POST
 *
 * PURPOSE: Allow users to like/heart posts
 *
 * ARCHITECTURE NOTES:
 * - "use server" ensures operation is atomic and secure
 * - Handles idempotency: Like action checks if like already exists
 * - If user likes same post twice, second attempt is ignored gracefully
 * - Creates notification when someone likes your post
 * - Uses optimistic updates on the client for instant UI feedback
 *
 * WHY THIS MATTERS:
 * - Users expect immediate visual feedback when liking
 * - Notification alerts post author of engagement
 * - Toast notifications can hide async latency
 *
 * @param postId - ID of post to like
 * @returns Like object or null if already liked
 */
export async function likePost(postId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in to like");
    }

    // Fetch post to get author info
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: { select: { clerkId: true } } },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // Check if user already liked this post (idempotency)
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    // If already liked, return without creating duplicate
    if (existingLike) {
      return { success: false, message: "Post already liked" };
    }

    // Create like
    const like = await prisma.like.create({
      data: {
        userId,
        postId,
      },
    });

    // Create notification for post author (if not liking own post)
    if (post.author.clerkId !== userId) {
      // Check if notification already exists (prevent duplicate notifications)
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: post.author.clerkId,
          creatorId: userId,
          type: "LIKE",
          postId,
        },
      });

      // Only create if notification doesn't exist
      if (!existingNotification) {
        await prisma.notification.create({
          data: {
            userId: post.author.clerkId,
            creatorId: userId,
            type: "LIKE",
            postId,
          },
        });
      }
    }

    // Invalidate cache to show updated like count
    revalidatePath("/");
    revalidatePath(`/post/${postId}`);

    return { success: true, like };
  } catch (error: any) {
    console.error("Error liking post:", error?.message);
    throw new Error(`Failed to like post: ${error?.message}`);
  }
}

/**
 * UNLIKE POST
 *
 * PURPOSE: Allow users to remove their like from a post
 *
 * ARCHITECTURE NOTES:
 * - Symmetric to likePost operation
 * - Gracefully handles case where user tries to unlike post they didn't like
 * - Does not remove notification (keeps engagement history)
 *
 * @param postId - ID of post to unlike
 * @returns Confirmation of unlike
 */
export async function unlikePost(postId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in");
    }

    // Try to delete the like
    const deletedLike = await prisma.like
      .delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      })
      .catch(() => null); // Return null if like doesn't exist

    if (!deletedLike) {
      return { success: false, message: "Post not liked" };
    }

    // Invalidate cache
    revalidatePath("/");
    revalidatePath(`/post/${postId}`);

    return { success: true, message: "Post unliked" };
  } catch (error: any) {
    console.error("Error unliking post:", error?.message);
    throw new Error(`Failed to unlike post: ${error?.message}`);
  }
}

/**
 * GET POST LIKES
 *
 * PURPOSE: Fetch all users who liked a specific post
 *
 * ARCHITECTURE NOTES:
 * - Used for "Liked by..." tooltip or modal
 * - Returns user info (name, avatar) for display
 *
 * @param postId - ID of post to fetch likes for
 * @returns Users who liked the post
 */
export async function getPostLikes(postId: string) {
  try {
    const likes = await prisma.like.findMany({
      where: { postId },
      include: {
        user: {
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

    return likes.map((like) => like.user);
  } catch (error: any) {
    console.error("Error fetching post likes:", error?.message);
    throw new Error(`Failed to fetch likes: ${error?.message}`);
  }
}

/**
 * CHECK IF USER LIKED POST
 *
 * PURPOSE: Determine if current user has liked a specific post
 *
 * ARCHITECTURE NOTES:
 * - Used to show filled/empty heart icon in UI
 * - Call once when post component mounts
 * - Optimistic updates on the client mean server version is stale
 *
 * @param postId - ID of post to check
 * @returns Boolean indicating if user liked post
 */
export async function hasUserLikedPost(postId: string): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return false; // Unauthenticated users can't like
    }

    const like = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    return !!like; // Convert to boolean
  } catch (error: any) {
    console.error("Error checking like status:", error?.message);
    return false; // Default to false on error
  }
}
