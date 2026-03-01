"use client";

import React, { useState } from "react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { createComment } from "@/actions/comment.action";
import { Avatar, AvatarImage } from "./ui/avatar";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { deleteComment } from "@/actions/comment.action";

/**
 * COMMENTS SECTION COMPONENT
 *
 * PURPOSE: Display comments on a post and allow adding new comments
 *
 * PROPS:
 * - postId: ID of post being commented on
 * - comments: Existing comments to display
 * - currentUserId: Current user's ID (for comment ownership check)
 *
 * ARCHITECTURE NOTES:
 * - "use client" for form interaction and state
 * - Manages two sections: comment form + comment list
 * - Optimistic updates for new comments (immediately show in list)
 * - Server Actions for persistence
 *
 * WINDOWS 11 DESIGN:
 * - Clean textarea with focus ring
 * - Comments displayed as cards with author avatars
 * - Delete button appears only for comment author
 */
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
}

interface CommentsSectionProps {
  postId: string;
  comments: Comment[];
  currentUserId?: string;
}

export default function CommentsSection({
  postId,
  comments: initialComments,
  currentUserId,
}: CommentsSectionProps) {
  const { user } = useUser();
  const router = useRouter();

  // State management
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );

  /**
   * Handle comment submission
   *
   * OPTIMISTIC UPDATE:
   * 1. Add comment to local state immediately
   * 2. Call createComment Server Action
   * 3. If success, server confirms via revalidatePath
   * 4. If error, remove from local state
   */
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be signed in to comment");
      return;
    }

    if (!commentText.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // OPTIMISTIC: Create fake comment object with user data
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`, // Temporary ID until server confirms
      content: commentText,
      createdAt: new Date().toISOString(),
      author: {
        id: user.id,
        name: user.fullName,
        username:
          user.username || user.emailAddresses[0].emailAddress.split("@")[0],
        image: user.imageUrl,
      },
    };

    try {
      // Optimistically update UI
      setComments((prev) => [optimisticComment, ...prev]);
      setCommentText("");

      // Call server action
      const newComment = await createComment(postId, commentText);

      // Replace optimistic comment with real one from server (serialize dates)
      setComments((prev) =>
        prev.map((c) =>
          c.id === optimisticComment.id
            ? ({
                ...newComment,
                createdAt:
                  typeof newComment.createdAt === "string"
                    ? newComment.createdAt
                    : (newComment.createdAt as any).toISOString(),
              } as Comment)
            : c,
        ),
      );

      // Refresh page to update counts
      router.refresh();
    } catch (err) {
      // REVERT optimistic update
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      const message = err instanceof Error ? err.message : "Failed to comment";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle comment deletion
   */
  const handleDeleteComment = async (commentId: string) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this comment?",
    );
    if (!confirmDelete) return;

    setDeletingCommentId(commentId);

    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      router.refresh();
    } catch (err) {
      console.error("Error deleting comment:", err);
      // TODO: Show error toast
    } finally {
      setDeletingCommentId(null);
    }
  };

  /**
   * Format time relative to now
   */
  const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Comment form - Only show if authenticated */}
      {user && (
        <form
          onSubmit={handleSubmitComment}
          className="bg-card border border-border rounded-lg p-4 space-y-3 fluent-shadow"
        >
          {/* Header with avatar and name */}
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 border border-border/50 shrink-0">
              <AvatarImage src={user.imageUrl} alt={user.username || "You"} />
            </Avatar>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </div>
              <textarea
                placeholder="Share your thoughts..."
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                className={`
                  w-full min-h-[80px] resize-none mt-2
                  bg-input border border-border rounded-md px-3 py-2
                  text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}
                `}
              />

              {/* Error message */}
              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCommentText("");
                    setError(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !commentText.trim()}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center fluent-shadow">
            <p className="text-muted-foreground">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`
                bg-card border border-border rounded-lg p-4 space-y-2
                hover:bg-secondary/30 transition-colors
                fluent-shadow
              `}
            >
              {/* Comment header */}
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  {/* Author avatar */}
                  <Avatar className="w-9 h-9 border border-border/50 shrink-0 mt-1">
                    <AvatarImage
                      src={comment.author.image || "/avatar.png"}
                      alt={comment.author.name || "User"}
                    />
                  </Avatar>

                  {/* Author info */}
                  <div>
                    <div className="font-semibold text-sm">
                      {comment.author.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      @{comment.author.username} ·{" "}
                      {formatTime(comment.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Delete button - only for comment author */}
                {currentUserId === comment.author.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    disabled={deletingCommentId === comment.id}
                    className="text-destructive hover:bg-destructive/10 ml-2 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Comment content */}
              <p className="text-foreground break-words">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
