"use client";

import React, { useState } from "react";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Link from "next/link";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/actions/notification.action";
import { useRouter } from "next/navigation";
import { Trash2, Heart, MessageCircle, UserPlus } from "lucide-react";

/**
 * NOTIFICATIONS LIST COMPONENT
 *
 * PURPOSE: Display notifications with actions (mark read, delete)
 *
 * PROPS:
 * - initialNotifications: Notifications from server
 *
 * ARCHITECTURE NOTES:
 * - "use client" for interactivity and state
 * - Shows notification type icon
 * - Groups notifications by type
 * - Mark as read action without page reload
 *
 * NOTIFICATION TYPES:
 * - LIKE: User liked your post
 * - COMMENT: User commented on your post
 * - FOLLOW: User started following you
 */
interface Notification {
  id: string;
  type: "LIKE" | "COMMENT" | "FOLLOW";
  read: boolean;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  post?: {
    id: string;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
  };
}

interface NotificationsListProps {
  initialNotifications: Notification[];
}

export default function NotificationsList({
  initialNotifications,
}: NotificationsListProps) {
  const router = useRouter();

  // State management
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Get notification icon based on type
   */
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LIKE":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "COMMENT":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "FOLLOW":
        return <UserPlus className="w-5 h-5 text-primary" />;
      default:
        return null;
    }
  };

  /**
   * Get notification message based on type
   */
  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case "LIKE":
        return `${notification.creator.name} liked your post`;
      case "COMMENT":
        return `${notification.creator.name} commented on your post`;
      case "FOLLOW":
        return `${notification.creator.name} started following you`;
      default:
        return "New notification";
    }
  };

  /**
   * Get notification link
   */
  const getNotificationLink = (notification: Notification) => {
    if (notification.type === "FOLLOW") {
      return `/profile/${notification.creator.username}`;
    }
    return `/post/${notification.post?.id}`;
  };

  /**
   * Mark single notification as read
   */
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      router.refresh();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      router.refresh();
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setIsMarkingAll(false);
    }
  };

  /**
   * Delete notification
   */
  const handleDeleteNotification = async (notificationId: string) => {
    setDeletingId(notificationId);
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      router.refresh();
    } catch (error) {
      console.error("Error deleting notification:", error);
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Format timestamp
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

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center space-y-4 fluent-shadow">
        <p className="text-muted-foreground text-lg">
          You're all caught up! No new notifications.
        </p>
      </div>
    );
  }

  // Count unread
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
          >
            {isMarkingAll ? "Marking..." : `Mark all as read (${unreadCount})`}
          </Button>
        </div>
      )}

      {/* Notifications list */}
      {notifications.map((notification) => {
        const link = getNotificationLink(notification);
        const isUnread = !notification.read;

        return (
          <Link
            key={notification.id}
            href={link}
            className={`
              group bg-card border border-border rounded-lg p-4
              hover:bg-secondary/50 transition-colors
              fluent-shadow cursor-pointer
              ${isUnread ? "bg-primary/5 border-primary/20" : ""}
            `}
          >
            <div className="flex items-start gap-4">
              {/* Notification icon */}
              <div className="mt-1 shrink-0">
                {getNotificationIcon(notification.type)}
              </div>

              {/* Notification content */}
              <div className="flex-1 min-w-0 space-y-1">
                {/* User avatar + name + message */}
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border border-border/50 shrink-0">
                    <AvatarImage
                      src={notification.creator.image || "/avatar.png"}
                      alt={notification.creator.name || "User"}
                    />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {getNotificationMessage(notification)}
                    </p>
                  </div>
                </div>

                {/* Post/Comment preview (if exists) */}
                {(notification.post || notification.comment) && (
                  <p className="text-xs text-muted-foreground truncate ml-10">
                    "
                    {notification.post?.content ||
                      notification.comment?.content}
                    "
                  </p>
                )}

                {/* Time */}
                <p className="text-xs text-muted-foreground ml-10">
                  {formatTime(notification.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div
                className="flex gap-2 shrink-0"
                onClick={(e) => e.preventDefault()}
              >
                {/* Mark as read button */}
                {isUnread && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleMarkAsRead(notification.id);
                    }}
                    className="w-2 h-2 rounded-full bg-primary hover:bg-primary/80 transition-colors"
                    title="Mark as read"
                  />
                )}

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteNotification(notification.id);
                  }}
                  disabled={deletingId === notification.id}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
