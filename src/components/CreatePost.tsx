"use client";

import { useUser } from "@clerk/nextjs";
import React, { useState } from "react";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { createPost } from "@/actions/post.action";
import { ImageIcon, Heart, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * CREATE POST COMPONENT
 *
 * PURPOSE: Allow authenticated users to compose and publish new posts
 *
 * ARCHITECTURE NOTES:
 * - "use client" directive makes this a Client Component for interactivity
 * - Textarea allows multiline input for rich post content
 * - Server Action (createPost) handles database write securely
 * - Image upload handled by UploadThing integration (TODO)
 * - Optimistic updates would show post immediately while server processes
 *
 * WINDOWS 11 DESIGN:
 * - White card on light mode, dark gray on dark mode
 * - Subtle borders (#e5e5e5 / #2d2d2d)
 * - Blue accent button for CTA (Windows 11 Blue #0067c0)
 * - Rounded corners (8px) for modern aesthetic
 *
 * STATE MANAGEMENT:
 * - content: Post text being composed
 * - isLoading: Shows loading state on button
 * - error: Displays validation messages
 *
 * @returns CreatePost component or null if user not authenticated
 */
function CreatePost() {
  const { user } = useUser();
  const router = useRouter();

  // State management
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  /**
   * Handle content input change
   * Updates character count for user feedback (280 char limit like Twitter)
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    setCharCount(text.length);
    setError(null); // Clear error when user starts typing
  };

  /**
   * Handle post submission
   *
   * WHY ASYNC/AWAIT:
   * - createPost is a Server Action (runs on backend)
   * - Must await its completion before showing success
   * - Errors from backend are caught and displayed
   *
   * USER EXPERIENCE:
   * - Loading state shows user action is processing
   * - Error messages explain what went wrong
   * - Success clears input and potentially shows toast
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!content.trim()) {
      setError("Post cannot be empty");
      return;
    }

    if (content.length > 280) {
      setError("Post must be 280 characters or less");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call Server Action to create post
      const post = await createPost(content);

      // Success: Clear form
      setContent("");
      setCharCount(0);

      // Revalidate feed to show new post
      // (createPost already calls revalidatePath, but router refresh ensures instant UI update)
      router.refresh();

      // TODO: Show success toast notification
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create post";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if user not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="w-full">
      {/* 
        WINDOWS 11 CARD STYLING:
        - bg-card: White (#ffffff) on light, #1a1a1a on dark
        - border-border: #e5e5e5 on light, #333333 on dark (subtle separation)
        - rounded-lg: 8px radius (Windows 11 standard)
        - shadow-sm: Directional drop shadow for depth (Fluent Design)
      */}
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-lg p-6 space-y-4 fluent-shadow"
      >
        {/* Header section with user avatar */}
        <div className="flex gap-4">
          {/* User Avatar - shows profile picture */}
          <Avatar className="w-12 h-12 border border-border/50 shrink-0">
            <AvatarImage src={user.imageUrl} alt={user.username || "User"} />
          </Avatar>

          {/* Post compose area */}
          <div className="flex-1 space-y-3">
            {/* Username display */}
            <div className="text-sm font-medium text-foreground/70">
              {user.firstName} {user.lastName}
            </div>

            {/* Main textarea for post content */}
            <Textarea
              placeholder="What's on your mind? (Max 280 characters)"
              value={content}
              onChange={handleContentChange}
              disabled={isLoading}
              className={`
                w-full min-h-[100px] resize-none
                bg-input border-border
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}
              `}
            />

            {/* Character counter - red if exceeding limit */}
            <div
              className={`text-xs font-medium ${
                charCount > 280 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {charCount}/280
            </div>

            {/* Error message display */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
                {error}
              </div>
            )}

            {/* Action buttons row */}
            <div className="flex items-center justify-between pt-2">
              {/* Icon buttons for media (TODO: UploadThing integration) */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title="Add image (coming soon)"
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Post button - Windows 11 Primary Blue */}
              <Button
                type="submit"
                disabled={isLoading || !content.trim()}
                className={`
                  bg-primary hover:bg-primary/90 text-primary-foreground
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                `}
              >
                {isLoading ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick stats under textarea (optional engagement preview) */}
        <div className="flex justify-around text-xs text-muted-foreground border-t border-border/50 pt-4">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>0</span>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CreatePost;
