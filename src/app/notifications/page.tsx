import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserNotifications } from "@/actions/notification.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NotificationsList from "@/components/NotificationsList";

/**
 * NOTIFICATIONS PAGE
 *
 * PURPOSE: Display all notifications for the current user
 *
 * ROUTE: /notifications
 * Requires authentication
 *
 * ARCHITECTURE NOTES:
 * - Server Component to fetch notifications (faster, more secure)
 * - Checks authentication (redirects if not signed in)
 * - Shows unread notifications by default
 * - Each notification includes context (who, what, post link)
 */
export default async function NotificationsPage() {
  // Check authentication
  const authUser = await currentUser();
  if (!authUser) {
    redirect("/");
  }

  let notifications: any[] = [];
  let error = null;

  try {
    // Fetch only unread notifications
    const rawNotifications = await getUserNotifications(true);

    // Serialize Date objects to strings for Client Component compatibility
    notifications = rawNotifications.map((notif) => ({
      ...notif,
      createdAt: notif.createdAt.toISOString(),
    }));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load notifications";
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground">
          Stay updated on likes, comments, and followers
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Notifications list or empty state */}
      {!error && <NotificationsList initialNotifications={notifications} />}
    </div>
  );
}
