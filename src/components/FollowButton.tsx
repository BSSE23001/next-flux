"use client";

import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { followUser, unfollowUser, isFollowing } from "@/actions/follow.action";
import { useRouter } from "next/navigation";

/**
 * FOLLOW BUTTON COMPONENT
 *
 * PURPOSE: Toggleable button to follow/unfollow users
 *
 * PROPS:
 * - userId: Clerk ID of user to follow/unfollow
 * - className: Optional Tailwind classes
 *
 * ARCHITECTURE NOTES:
 * - "use client" for state and interactivity
 * - Loads follow status from server on mount
 * - OPTIMISTIC updates for instant user feedback
 * - Uses Server Actions for secure backend operations
 *
 * STATE CHANGES:
 * - Initial load: Fetch follow status from server
 * - Click: Optimistically toggle UI
 * - Server responds: Confirm or revert
 *
 * WHY OPTIMISTIC:
 * - Follow is a lightweight operation
 * - Users expect instant visual feedback
 * - Revert is easy if error occurs
 */
interface FollowButtonProps {
  userId: string;
  className?: string;
}

export default function FollowButton({ userId, className }: FollowButtonProps) {
  const router = useRouter();

  // State management
  const [isUserFollowing, setIsUserFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Load initial follow status on mount
   *
   * WHY useEffect:
   * - Need to fetch from server after component mounts
   * - Can't use async in component body
   * - Dependencies array prevents multiple fetches
   */
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const following = await isFollowing(userId);
        setIsUserFollowing(following);
      } catch (error) {
        console.error("Error checking follow status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFollowStatus();
  }, [userId]);

  /**
   * OPTIMISTIC FOLLOW/UNFOLLOW HANDLER
   *
   * Flow:
   * 1. Save current state
   * 2. Optimistically update UI
   * 3. Call Server Action
   * 4. If success, refresh page to update counts
   * 5. If error, revert UI
   */
  const handleFollowToggle = async () => {
    // Save state for revert
    const previousFollowing = isUserFollowing;

    try {
      setIsSubmitting(true);

      // OPTIMISTIC update
      setIsUserFollowing(!previousFollowing);

      // Call server action
      if (previousFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }

      // Refresh to update follower counts
      router.refresh();
    } catch (error) {
      console.error("Error toggling follow:", error);
      // REVERT optimistic update
      setIsUserFollowing(previousFollowing);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while fetching initial status
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="w-24">
        ...
      </Button>
    );
  }

  return (
    <Button
      onClick={handleFollowToggle}
      disabled={isSubmitting}
      variant={isUserFollowing ? "outline" : "default"}
      size="sm"
      className={`
        min-w-fit
        ${
          isUserFollowing
            ? "text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
            : "bg-primary hover:bg-primary/90 text-primary-foreground"
        }
        transition-colors
        ${className}
      `}
    >
      {isSubmitting ? "..." : isUserFollowing ? "Following" : "Follow"}
    </Button>
  );
}
