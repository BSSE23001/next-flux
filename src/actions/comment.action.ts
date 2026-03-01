"use server";

import { prisma } from "@/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * CREATE COMMENT
 *
 * PURPOSE: Allow authenticated users to comment on posts
 *
 * ARCHITECTURE NOTES:
 * - Server Action ensures only authenticated users can comment
 * - Creates notification when someone comments on your post
 * - revalidatePath updates the post detail page immediately
 *
 * @param postId - ID of post being commented on
 * @param content - Comment text content
 * @returns Created comment with author info
 */
export async function createComment(postId: string, content: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in to comment");
    }

    if (!content?.trim()) {
      throw new Error("Comment cannot be empty");
    }

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: { select: { clerkId: true } } },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        authorId: userId,
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
      },
    });

    // Create notification for post author (if not commenting on own post)
    if (post.author.clerkId !== userId) {
      await prisma.notification.create({
        data: {
          userId: post.author.clerkId,
          creatorId: userId,
          type: "COMMENT",
          postId,
          commentId: comment.id,
        },
      });
    }

    // Invalidate post detail page
    revalidatePath(`/post/${postId}`);
    revalidatePath("/");

    return comment;
  } catch (error: any) {
    console.error("Error creating comment:", error?.message);
    throw new Error(`Failed to create comment: ${error?.message}`);
  }
}

/**
 * GET POST COMMENTS
 *
 * PURPOSE: Fetch all comments for a post
 *
 * ARCHITECTURE NOTES:
 * - Used on post detail pages
 * - Comments sorted by newest first (most recent responses visible)
 * - Includes author info for each comment
 *
 * @param postId - ID of post to fetch comments for
 * @returns Comments with author information
 */
export async function getPostComments(postId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId },
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
    });

    return comments;
  } catch (error: any) {
    console.error("Error fetching comments:", error?.message);
    throw new Error(`Failed to fetch comments: ${error?.message}`);
  }
}

/**
 * DELETE COMMENT
 *
 * PURPOSE: Allow comment author to delete their comment
 *
 * SECURITY NOTES:
 * - Only the comment author can delete
 * - Prevents users from deleting other people's comments
 * - Validates user ownership before deletion
 *
 * @param commentId - ID of comment to delete
 * @returns Confirmation of deletion
 */
export async function deleteComment(commentId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in");
    }

    // Fetch comment to verify ownership
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: { select: { clerkId: true } },
        post: { select: { id: true } },
      },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    // Security: Only author can delete their comment
    if (comment.author.clerkId !== userId) {
      throw new Error("Unauthorized: You can only delete your own comments");
    }

    // Delete comment
    await prisma.comment.delete({
      where: { id: commentId },
    });

    // Invalidate related pages
    revalidatePath(`/post/${comment.post.id}`);
    revalidatePath("/");

    return { success: true, message: "Comment deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting comment:", error?.message);
    throw new Error(`Failed to delete comment: ${error?.message}`);
  }
}
