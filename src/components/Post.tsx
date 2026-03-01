"use client";

import React, { useState } from "react";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Link from "next/link";
import { likePost, unlikePost } from "@/actions/like.action";
import { deletePost } from "@/actions/post.action";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * POST COMPONENT
 *
 * PURPOSE: Display a single post with author info, content, and engagement metrics
 *
 * PROPS:
 * - post: Post object with author, content, engagement counts
 * - isAuthor: Boolean indicating if current user wrote this post
 * - onDelete: Optional callback when post is deleted
 *
 * ARCHITECTURE NOTES:
 * - "use client" for interactivity (likes, deletes)
 * - Optimistic updates: UI shows changes immediately, server validates
 * - Engagement counts updated in real-time via state
 * - Delete only available to post author (verified server-side)
 *
 * WINDOWS 11 DESIGN:
 * - White card background with subtle border
 * - Hover states with bg-secondary/50 for interactivity feedback
 * - Icons match Lucide icon style (clean, minimal)
 * - Blue icons for interactions (primary color)
 *
 * WHY OPTIMISTIC UPDATES:
 * - Users expect instant visual feedback
 * - Server Action might take 100-300ms
 * - Reverting changes if server fails provides fallback
 */
interface PostProps {
  post: {
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
  };
  isAuthor?: boolean;
  initialIsLiked?: boolean;
  onDelete?: () => void;
}

export default function Post({
  post,
  isAuthor = false,
  initialIsLiked = false,
  onDelete,
}: PostProps) {
  const { user } = useUser();
  const router = useRouter();

  // OPTIMISTIC STATE MANAGEMENT
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * OPTIMISTIC LIKE HANDLER
   *
   * WHY OPTIMISTIC:
   * 1. User clicks like button
   * 2. UI immediately shows filled heart + incremented count
   * 3. Server Action called in background
   * 4. If server fails, UI reverts change
   *
   * This creates the illusion of instant feedback, improving UX.
   * Traditional approach would wait for server (100-300ms delay).
   */
  const handleLike = async () => {
    // Prevent double-clicks while request is pending
    if (!user) {
      // Redirect to sign in or show prompt
      return;
    }

    // Save current state for reverting if needed
    const previousIsLiked = isLiked;
    const previousCount = likeCount;

    try {
      // OPTIMISTICALLY update UI
      setIsLiked(!isLiked);
      setLikeCount(!isLiked ? likeCount + 1 : likeCount - 1);

      // Then call server
      if (isLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }

      // Server call succeeded, state is correct
      router.refresh();
    } catch (error) {
      // REVERT optimistic update on error
      console.error("Error updating like:", error);
      setIsLiked(previousIsLiked);
      setLikeCount(previousCount);
      // TODO: Show error toast
    }
  };

  /**
   * DELETE HANDLER
   *
   * WHY NOT OPTIMISTIC:
   * - Deletion is destructive (can't easily undo visually)
   * - User should see confirmation/loading state
   * - Slower to revert the entire post component removal
   */
  const handleDelete = async () => {
    if (!isAuthor) {
      console.error("User is not post author");
      return;
    }

    const confirmDelete = confirm(
      "Are you sure you want to delete this post? This action cannot be undone.",
    );
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      await deletePost(post.id);
      // Callback to parent component to remove from list
      if (onDelete) {
        onDelete();
      }
      router.refresh();
    } catch (error) {
      console.error("Error deleting post:", error);
      // TODO: Show error toast
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Format timestamp as relative time (e.g., "2 hours ago")
   */
  const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div
      className={`
        bg-card border border-border rounded-lg p-4 space-y-3
        hover:bg-secondary/30 transition-colors duration-200
        fluent-shadow
      `}
    >
      {/* Header: Avatar + Author info + Delete button */}
      <div className="flex items-start justify-between">
        <Link href={`/profile/${post.author.username}`} className="group">
          <div className="flex gap-3">
            {/* Author Avatar */}
            <Avatar className="w-10 h-10 border border-border/50">
              <AvatarImage
                src={post.author.image || "/avatar.png"}
                alt={post.author.name || "User"}
              />
            </Avatar>

            {/* Author name + username + timestamp */}
            <div className="flex flex-col">
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {post.author.name}
              </div>
              <div className="text-xs text-muted-foreground">
                @{post.author.username} · {formatTime(post.createdAt)}
              </div>
            </div>
          </div>
        </Link>

        {/* Delete button - only show to post author */}
        {isAuthor && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Delete post"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Post content */}
      <p className="text-foreground break-words">{post.content}</p>

      {/* Post image (if exists) */}
      {post.image && (
        <div className="mt-3 rounded-lg overflow-hidden border border-border/50">
          <img
            src={post.image}
            alt="Post image"
            className="w-full h-auto max-h-96 object-cover"
          />
        </div>
      )}

      {/* Engagement buttons row */}
      <div className="flex gap-8 pt-3 border-t border-border/50 text-muted-foreground">
        {/* Comments button */}
        <Link href={`/post/${post.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">{post._count.comments}</span>
          </Button>
        </Link>

        {/* Like button - OPTIMISTIC UPDATE */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={!user}
          className={`
            gap-2 transition-colors
            ${
              isLiked
                ? "text-red-500 hover:bg-red-500/10"
                : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            }
          `}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
          <span className="text-xs">{likeCount}</span>
        </Button>
      </div>
    </div>
  );
}
