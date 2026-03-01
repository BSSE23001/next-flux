import { currentUser } from "@clerk/nextjs/server";
import React from "react";
import ModeToggle from "./ModeToggle";
import { Button } from "./ui/button";
import Link from "next/link";
import { BellIcon, HomeIcon, UserIcon } from "lucide-react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { getUnreadNotificationCount } from "@/actions/notification.action";

/**
 * DESKTOP NAVBAR
 *
 * PURPOSE: Navigation menu for desktop/large screens
 *
 * ARCHITECTURE NOTES:
 * - Server Component (uses auth and notification count)
 * - Fetches unread notification count for bell badge
 * - Hidden on mobile (md:hidden in layout)
 * - Shows home, notifications, profile links for authenticated users
 *
 * WINDOWS 11 DESIGN:
 * - Subtle hover states with secondary/50 background
 * - Icons from Lucide (clean, minimal style)
 * - Blue text for primary action (Sign In)
 */
async function DesktopNavbar() {
  const user = await currentUser();

  // Fetch notification count if authenticated
  let unreadCount = 0;
  if (user) {
    try {
      unreadCount = await getUnreadNotificationCount();
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  }

  return (
    <div className="hidden md:flex items-center space-x-2">
      {/* Theme toggle */}
      <ModeToggle />

      {/* Home button - always visible */}
      <Button
        variant="ghost"
        className={`
          flex items-center gap-2
          text-muted-foreground hover:text-foreground
          hover:bg-secondary/50 transition-colors
        `}
        asChild
      >
        <Link href="/">
          <HomeIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Home</span>
        </Link>
      </Button>

      {user ? (
        <>
          {/* Notifications button with badge */}
          <Button
            variant="ghost"
            className={`
              relative flex items-center gap-2
              text-muted-foreground hover:text-foreground
              hover:bg-secondary/50 transition-colors
            `}
            asChild
          >
            <Link href="/notifications">
              <div className="relative">
                <BellIcon className="w-4 h-4" />
                {/* Notification badge */}
                {unreadCount > 0 && (
                  <span
                    className={`
                      absolute -top-2 -right-2 
                      bg-destructive text-white text-xs rounded-full
                      w-5 h-5 flex items-center justify-center font-bold
                    `}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden lg:inline">Notifications</span>
            </Link>
          </Button>

          {/* Profile button */}
          <Button
            variant="ghost"
            className={`
              flex items-center gap-2
              text-muted-foreground hover:text-foreground
              hover:bg-secondary/50 transition-colors
            `}
            asChild
          >
            <Link
              href={`/profile/${
                user.username ??
                user.emailAddresses[0].emailAddress.split("@")[0]
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Profile</span>
            </Link>
          </Button>

          {/* User menu dropdown */}
          <UserButton />
        </>
      ) : (
        <SignInButton mode="modal">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Sign In
          </Button>
        </SignInButton>
      )}
    </div>
  );
}

export default DesktopNavbar;
