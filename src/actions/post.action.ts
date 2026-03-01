"use server";

import { prisma } from "@/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * CREATE POST ACTION
 *
 * PURPOSE: Allow authenticated users to create new posts with optional images
 *
 * ARCHITECTURE NOTES:
 * - "use server" directive makes this a Server Action (runs on backend only)
 * - Server Actions are more secure than API routes for mutations
 * - Authentication check prevents unauthorized posts
 * - revalidatePath() invalidates ISR cache so new posts appear immediately
 *
 * WHY THIS PATTERN:
 * - Post creation requires file uploads (handled by UploadThing)
 * - Database write should happen on server only
 * - User context (Clerk auth) is available server-side
 *
 * @param content - Post text content
 * @param imageUrl - Optional image URL from UploadThing
 * @returns Created post with author info, or null if unauthorized
 */
export async function createPost(content: string, imageUrl?: string) {
  try {
    // Check authentication - only logged-in users can post
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in to create post");
    }

    // Fetch current user's name and profile from database
    const user = await currentUser();
    if (!user) {
      throw new Error("User not found");
    }

    // Basic validation - post cannot be empty
    if (!content?.trim()) {
      throw new Error("Post content cannot be empty");
    }

    // Limit post length (Twitter-like UX)
    if (content.length > 280) {
      throw new Error("Post must be 280 characters or less");
    }

    // Create post in database
    // Relations (author) are auto-populated via Prisma foreign key
    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        image: imageUrl || null, // Optional image attachment
        authorId: userId, // Clerk userID stored here (synced to DB via syncUser)
      },
      // Include author info to return complete post to client
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        // _count gives us engagement counts without fetching all relations
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    // REVALIDATION: Invalidate home page cache so new post appears immediately
    // This is ISR (Incremental Static Regeneration) in Next.js 14
    // Without this, users might see stale feed for up to 60 seconds
    revalidatePath("/");

    return post;
  } catch (error: any) {
    console.error("Error creating post:", error?.message);
    throw new Error(`Failed to create post: ${error?.message}`);
  }
}

/**
 * GET FEED POSTS
 *
 * PURPOSE: Fetch paginated posts for the home feed with engagement data
 *
 * ARCHITECTURE NOTES:
 * - Used for infinite scroll / pagination
 * - Returns posts sorted by newest first (createdAt DESC)
 * - Includes counts of likes/comments for UI display
 * - Does NOT include actual likes/comments arrays (performance)
 *
 * WHY THIS PATTERN:
 * - Pagination prevents loading all posts (database performance)
 * - _count is efficient - doesn't fetch full relation arrays
 * - Sorting by newest first matches Twitter-like UX
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Posts per page (default 10)
 * @returns Posts with author and engagement counts
 */
export async function getFeedPosts(page: number = 1, limit: number = 10) {
  try {
    // Calculate offset for pagination
    // Page 1 = offset 0, Page 2 = offset 10, etc.
    const offset = (page - 1) * limit;

    // Fetch posts with pagination
    const posts = await prisma.post.findMany({
      // Sort by newest first
      orderBy: {
        createdAt: "desc",
      },
      // Pagination
      take: limit,
      skip: offset,
      // Include author info for display
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        // Count engagement but don't fetch actual relations
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    // Also fetch total post count for pagination info
    const total = await prisma.post.count();

    return {
      posts,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    };
  } catch (error: any) {
    console.error("Error fetching feed:", error?.message);
    throw new Error(`Failed to fetch feed: ${error?.message}`);
  }
}

/**
 * GET USER POSTS
 *
 * PURPOSE: Fetch all posts by a specific user for profile page
 *
 * ARCHITECTURE NOTES:
 * - Used when visiting user profiles
 * - Filters by authorId to get only one user's posts
 * - Sorted by newest first for reverse chronological view
 *
 * @param userId - Clerk user ID or username to fetch posts from
 * @returns User's posts with engagement counts
 */
export async function getUserPosts(userId: string) {
  try {
    // Fetch user by ID or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId: userId }, { username: userId }],
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Fetch all posts by this user
    const posts = await prisma.post.findMany({
      where: {
        authorId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    return posts;
  } catch (error: any) {
    console.error("Error fetching user posts:", error?.message);
    throw new Error(`Failed to fetch user posts: ${error?.message}`);
  }
}

/**
 * GET POST DETAIL
 *
 * PURPOSE: Fetch single post with all engagement data for detailed view
 *
 * ARCHITECTURE NOTES:
 * - Used when clicking on a post to expand it
 * - Includes comments and likes for context
 * - More expensive than feed fetch (includes relations)
 *
 * @param postId - ID of post to fetch
 * @returns Complete post with comments, likes, and author info
 */
export async function getPostDetail(postId: string) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        comments: {
          include: {
            author: {
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
        },
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    return post;
  } catch (error: any) {
    console.error("Error fetching post detail:", error?.message);
    throw new Error(`Failed to fetch post: ${error?.message}`);
  }
}

/**
 * DELETE POST
 *
 * PURPOSE: Allow post author to delete their own post
 *
 * ARCHITECTURE NOTES:
 * - Only the post author can delete their own post
 * - Cascade delete removes all comments and likes (defined in schema)
 * - Invalidates cache and home page feed
 *
 * SECURITY NOTE:
 * - Always verify user ID matches post author before deletion
 * - Never trust client-provided IDs for security-critical operations
 *
 * @param postId - ID of post to delete
 * @returns Deleted post object or error
 */
export async function deletePost(postId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in");
    }

    // Fetch post to verify ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { clerkId: true },
        },
      },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // Security: Only author can delete their post
    if (post.author.clerkId !== userId) {
      throw new Error("Unauthorized: You can only delete your own posts");
    }

    // Delete post (cascade deletes comments and likes)
    await prisma.post.delete({
      where: { id: postId },
    });

    // Invalidate feed cache
    revalidatePath("/");

    return { success: true, message: "Post deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting post:", error?.message);
    throw new Error(`Failed to delete post: ${error?.message}`);
  }
}
