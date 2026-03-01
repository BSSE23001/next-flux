import React from "react";
import { getPostDetail } from "@/actions/post.action";
import { currentUser } from "@clerk/nextjs/server";
import Post from "@/components/Post";
import CommentsSection from "@/components/CommentsSection";
import { Card } from "@/components/ui/card";

/**
 * POST DETAIL PAGE
 *
 * PURPOSE: Display a single post with all its comments
 *
 * ROUTE: /post/[postId]
 *
 * ARCHITECTURE NOTES:
 * - Server Component (uses async/await)
 * - Fetches post data server-side (better SEO, security)
 * - Dynamic route using postId parameter
 * - Includes comments section for discussion
 *
 * WHY SERVER COMPONENT:
 * - Post data should be fetched server-side (security, SEO)
 * - Comments are static until you interact (post/delete)
 * - Reduces bundle size (less JS sent to client)
 */
interface PostPageProps {
  params: Promise<{ postId: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params;
  const authUser = await currentUser();

  let post = null;
  let error = null;

  try {
    // Fetch post with all comments and engagement data
    post = await getPostDetail(postId);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load post";
  }

  // Error state
  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-8 text-center space-y-4">
        <p className="text-destructive font-medium">Failed to load post</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  // Not found state
  if (!post) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4 fluent-shadow">
        <p className="text-foreground font-medium">Post not found</p>
        <p className="text-sm text-muted-foreground">
          The post you're looking for doesn't exist or has been deleted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Single post display */}
      <Post
        post={{
          id: post.id,
          content: post.content || "",
          image: post.image,
          createdAt: post.createdAt.toISOString(),
          author: post.author,
          _count: post._count,
        }}
        isAuthor={authUser?.id === post.author.id}
      />

      {/* Comments section */}
      <CommentsSection
        postId={postId}
        comments={(post.comments || []).map((comment) => ({
          ...comment,
          createdAt: comment.createdAt.toISOString(),
        }))}
        currentUserId={authUser?.id}
      />
    </div>
  );
}
