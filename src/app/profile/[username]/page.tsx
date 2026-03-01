import React from "react";
import { redirect } from "next/navigation";
import { getUserByClerkId, syncUser } from "@/actions/user.action";
import { getUserPosts } from "@/actions/post.action";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/db";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import FollowButton from "@/components/FollowButton";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, LinkIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import Post from "@/components/Post";

/**
 * PROFILE PAGE
 *
 * PURPOSE: Display user profile with bio, followers, and posts
 *
 * ROUTE: /profile/[username]
 *
 * ARCHITECTURE NOTES:
 * - Server Component (uses DB queries)
 * - Fetches user by username (from URL param)
 * - Shows user bio, location, website, follower counts
 * - Lists all posts by this user
 * - Follow button if viewing someone else's profile
 */
interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const authUser = await currentUser();

  // Ensure user is synced to DB if authenticated
  if (authUser) {
    await syncUser();
  }

  // Fetch user by username
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      _count: {
        select: {
          posts: true,
          followers: true,
          following: true,
        },
      },
    },
  });

  // User not found
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-lg p-12 text-center space-y-4 fluent-shadow">
        <p className="text-foreground font-medium">User not found</p>
        <p className="text-sm text-muted-foreground">
          The user you're looking for doesn't exist.
        </p>
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    );
  }

  // Fetch user's posts
  let posts: any[] = [];
  try {
    posts = await getUserPosts(user.clerkId);
  } catch (error) {
    console.error("Error fetching user posts:", error);
  }

  const isOwnProfile = authUser?.id === user.clerkId;
  const isFollowing = authUser
    ? await prisma.follows.findUnique({
        where: {
          followerId_followingId: {
            followerId: authUser.id,
            followingId: user.clerkId,
          },
        },
      })
    : false;

  return (
    <div className="space-y-6">
      {/* Profile header card */}
      <Card className="fluent-shadow">
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Header section with avatar, name, and buttons */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                {/* Avatar */}
                <Avatar className="w-20 h-20 border-2 border-border shrink-0">
                  <AvatarImage
                    src={user.image || "/avatar.png"}
                    alt={user.name || "User"}
                  />
                </Avatar>

                {/* User info */}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {user.name}
                  </h1>
                  <p className="text-muted-foreground">@{user.username}</p>

                  {user.bio && (
                    <p className="mt-2 text-foreground/80">{user.bio}</p>
                  )}

                  {/* Location and website */}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                    {user.location && (
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" />
                        {user.location}
                      </div>
                    )}
                    {user.website && (
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <LinkIcon className="w-4 h-4" />
                        {new URL(user.website).hostname}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Follow/Edit button */}
              {authUser && !isOwnProfile && (
                <FollowButton userId={user.clerkId} />
              )}
              {isOwnProfile && (
                <Link href="/settings/profile">
                  <Button variant="outline">Edit Profile</Button>
                </Link>
              )}
            </div>

            {/* Stats section */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <p className="font-bold text-lg">{user._count.posts}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <Link
                href={`/profile/${username}/followers`}
                className="hover:bg-secondary/50 p-3 rounded"
              >
                <p className="font-bold text-lg">{user._count.followers}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </Link>
              <Link
                href={`/profile/${username}/following`}
                className="hover:bg-secondary/50 p-3 rounded"
              >
                <p className="font-bold text-lg">{user._count.following}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Posts</h2>

        {posts.length === 0 ? (
          <Card className="fluent-shadow">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No posts yet</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Post
              key={post.id}
              post={{
                id: post.id,
                content: post.content || "",
                image: post.image,
                createdAt: post.createdAt.toISOString(),
                author: post.author,
                _count: post._count,
              }}
              isAuthor={isOwnProfile}
            />
          ))
        )}
      </div>
    </div>
  );
}
