"use server";

import { prisma } from "@/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * GET USER NOTIFICATIONS
 *
 * PURPOSE: Fetch all unread notifications for the current user
 *
 * ARCHITECTURE NOTES:
 * - Includes creator info (who triggered the notification)
 * - Includes related post/comment for context
 * - Sorted by newest first
 * - Used for notification panel/bell icon dropdown
 *
 * WHY THIS PATTERN:
 * - Notifications are personal data (must authenticate)
 * - Need creator context to show "John liked your post"
 * - Post/comment context allows linking to relevant content
 *
 * @param unreadOnly - If true, only fetch unread notifications
 * @returns User's notifications with full context
 */
export async function getUserNotifications(unreadOnly: boolean = true) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        // Optionally filter to unread only
        ...(unreadOnly && { read: false }),
      },
      include: {
        // Creator info: "John liked your post" -> John is creator
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        // Related post for linking
        post: {
          select: {
            id: true,
            content: true,
          },
        },
        // Related comment for context
        comment: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return notifications;
  } catch (error: any) {
    console.error("Error fetching notifications:", error?.message);
    throw new Error(`Failed to fetch notifications: ${error?.message}`);
  }
}

/**
 * MARK NOTIFICATION AS READ
 *
 * PURPOSE: Record that user has seen a notification
 *
 * ARCHITECTURE NOTES:
 * - Updates read status so notification isn't shown in unread badge
 * - Idempotent - can be called multiple times safely
 *
 * @param notificationId - ID of notification to mark as read
 * @returns Updated notification
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in");
    }

    // Fetch notification to verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Security: Only the user receiving the notification can mark it as read
    if (notification.userId !== userId) {
      throw new Error(
        "Unauthorized: You can only update your own notifications",
      );
    }

    // Mark as read
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    // Invalidate notifications page
    revalidatePath("/notifications");

    return updated;
  } catch (error: any) {
    console.error("Error marking notification as read:", error?.message);
    throw new Error(`Failed to mark notification: ${error?.message}`);
  }
}

/**
 * MARK ALL NOTIFICATIONS AS READ
 *
 * PURPOSE: Quickly mark all unread notifications as read
 *
 * ARCHITECTURE NOTES:
 * - Bulk update for performance
 * - Common action shown in notification panel header
 *
 * @returns Count of notifications marked
 */
export async function markAllNotificationsAsRead() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    // Invalidate notifications page
    revalidatePath("/notifications");

    return { message: `Marked ${result.count} notifications as read` };
  } catch (error: any) {
    console.error("Error marking all notifications:", error?.message);
    throw new Error(`Failed to mark notifications: ${error?.message}`);
  }
}

/**
 * GET UNREAD NOTIFICATION COUNT
 *
 * PURPOSE: Get total count of unread notifications for badge display
 *
 * ARCHITECTURE NOTES:
 * - Fast query - just counts, doesn't fetch full notifications
 * - Used for red badge on bell icon
 * - Called frequently, should be cached by frontend
 *
 * @returns Count of unread notifications
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return 0; // Unauthenticated users have no notifications
    }

    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return count;
  } catch (error: any) {
    console.error("Error fetching unread count:", error?.message);
    return 0; // Return 0 on error instead of throwing
  }
}

/**
 * DELETE NOTIFICATION
 *
 * PURPOSE: Allow users to delete unwanted notifications
 *
 * @param notificationId - ID of notification to delete
 * @returns Confirmation
 */
export async function deleteNotification(notificationId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized: Must be logged in");
    }

    // Fetch notification to verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Security check
    if (notification.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    revalidatePath("/notifications");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting notification:", error?.message);
    throw new Error(`Failed to delete notification: ${error?.message}`);
  }
}
