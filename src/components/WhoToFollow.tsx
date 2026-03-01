import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { getSuggestedUsers } from "@/actions/follow.action";
import { Button } from "./ui/button";
import Link from "next/link";
import { Avatar, AvatarImage } from "./ui/avatar";
import FollowButton from "./FollowButton";
import { currentUser } from "@clerk/nextjs/server";

/**
 * WHO TO FOLLOW COMPONENT
 *
 * PURPOSE: Display suggested users in sidebar with follow buttons
 *
 * ARCHITECTURE NOTES:
 * - Server Component (doesn't need "use client")
 * - Fetches suggested users via Server Action
 * - Shows up to 5 recommendations
 * - Located in sticky sidebar (doesn't scroll away)
 *
 * ALGORITHM:
 * - Shows users followed by people you follow (2nd-degree connections)
 * - Avoids users already followed
 * - Avoids self-recommendations
 * - Great for network growth (like LinkedIn/Twitter)
 *
 * WINDOWS 11 DESIGN:
 * - Card with subtle border and shadow
 * - Avatar with border for definition
 * - Blue "Follow" button for CTAs
 * - Hover states on user names for interactivity feedback
 */
export default async function WhoToFollow() {
  const authUser = await currentUser();

  let suggestedUsers: any[] = [];

  try {
    // Fetch suggested users
    suggestedUsers = await getSuggestedUsers(5);
  } catch (error) {
    console.error("Error fetching suggested users:", error);
  }

  return (
    <Card className="sticky top-24 fluent-shadow">
      <CardHeader>
        <CardTitle className="text-lg">Who to Follow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No suggestions available
          </p>
        ) : (
          suggestedUsers.map((user: any) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              {/* User info (name + avatar) */}
              <Link
                href={`/profile/${user.username}`}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <Avatar className="w-10 h-10 border border-border/50 shrink-0">
                  <AvatarImage
                    src={user.image || "/avatar.png"}
                    alt={user.name || "User"}
                  />
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {user.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{user.username}
                  </div>
                </div>
              </Link>

              {/* Follow button */}
              {authUser ? (
                <FollowButton userId={user.id} className="ml-2 shrink-0" />
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
