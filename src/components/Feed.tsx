"use client";

import React, { useEffect, useState } from "react";
import Post from "./Post";
import { getFeedPosts } from "@/actions/post.action";
import { useUser } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

/**
 * FEED COMPONENT
 *
 * PURPOSE: Display paginated feed of posts with infinite scroll capability
 *
 * ARCHITECTURE NOTES:
 * - "use client" component for state management and pagination
 * - Fetches posts on mount and when user scrolls to bottom
 * - Uses useEffect for data fetching
 * - Manages loading/error states for UX feedback
 *
 * PAGINATION PATTERN:
 * - Page-based pagination (not cursor-based)
 * - Each page loads 10 posts
 * - "Load More" button for explicit pagination
 * - Could be enhanced to infinite scroll with Intersection Observer
 *
 * WHY THIS APPROACH:
 * - Page-based is simpler to implement
 * - Works well with Next.js revalidation
 * - User has explicit control via button
 * - Easier to track position in feed
 */
interface FeedPost {
  id: string;
  content: string;
  image?: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

export default function Feed() {
  const { user } = useUser();

  // State management
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Fetch posts from server
   *
   * WHY useEffect:
   * - Need to run after component mounts
   * - Fetch is async, component needs to render before data arrives
   * - Dependencies array prevents infinite loops
   */
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Reset posts on first page load
        if (page === 1) {
          setPosts([]);
        }

        // Fetch posts from server
        const result = await getFeedPosts(page, 10);

        // Append to existing posts (pagination)
        // Page 1 replaces existing, Page 2+ appends
        setPosts((prev) => {
          // Fix the incoming posts to match FeedPost type with serialized dates
          const newPosts = result.posts.map((post: any) => ({
            ...post,
            content: post.content ?? "", // Coalesce null to empty string
            createdAt:
              typeof post.createdAt === "string"
                ? post.createdAt
                : post.createdAt.toISOString(),
          }));

          return page === 1 ? newPosts : [...prev, ...newPosts];
        });

        setHasMore(result.hasMore);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load posts";
        setError(message);
        console.error("Error loading posts:", err);
        // TODO: Show error toast
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, [page]); // Re-run when page changes

  /**
   * Load next page of posts
   */
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  /**
   * Remove post from feed when deleted
   * Called by Post component's onDelete callback
   */
  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  /**
   * LOADING STATE
   * Show skeleton or spinner while fetching initial posts
   */
  if (isLoading && page === 1) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    );
  }

  /**
   * ERROR STATE
   * Display error message with retry option
   */
  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center space-y-4">
        <p className="text-destructive font-medium">Failed to load posts</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => setPage(1)} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  /**
   * EMPTY STATE
   * When user has no posts or feed is empty
   */
  if (posts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center space-y-4 fluent-shadow">
        <p className="text-muted-foreground">No posts yet</p>
        <p className="text-sm text-muted-foreground">
          {user
            ? "Start by creating a post or following other users"
            : "Sign in to see your feed"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Posts list */}
      {posts.map((post) => (
        <Post
          key={post.id}
          post={post}
          isAuthor={user?.id === post.author.id}
          onDelete={() => handlePostDelete(post.id)}
        />
      ))}

      {/* Load More button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More Posts"
            )}
          </Button>
        </div>
      )}

      {/* End of feed indicator */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>You've reached the end of your feed</p>
        </div>
      )}
    </div>
  );
}
