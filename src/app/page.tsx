import CreatePost from "@/components/CreatePost";
import Feed from "@/components/Feed";
import WhoToFollow from "@/components/WhoToFollow";
import { currentUser } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * HOME PAGE (FEED PAGE)
 * 
 * PURPOSE: Main feed view showing user's posts and posts from users they follow
 * 
 * ARCHITECTURE NOTES:
 * - Server Component (async) to sync user with database
 * - Uses currentUser() from Clerk to get auth context
 * - Layout: 3-column grid on desktop, single column on mobile
 * - Column 1: Empty (sidebar handled in layout.tsx)
 * - Column 2: CreatePost + Feed (main content)
 * - Column 3: Who to Follow (sideba
r)
 * 
 * WHY THIS LAYOUT:
 * - CreatePost at top for discoverability
 * - Feed below creates natural scroll-down behavior
 * - Who to Follow on right drives engagement (like Twitter)
 * - Responsive: Hidden on mobile, shown on desktop
 * 
 * WINDOWS 11 DESIGN:
 * - No explicit background color - inherits from body (managed in globals.css)
 * - Cards have subtle borders and shadows
 * - Typography uses system fonts (Geist)
 * - Spacing uses Tailwind's consistent scale
 */
export default async function Home() {
  const authUser = await currentUser();

  return (
    <div className="space-y-6">
      {/* 
        CONDITIONAL RENDERING:
        - If user is authenticated, show CreatePost
        - If not, show sign-in prompt
      */}
      {authUser ? (
        <CreatePost />
      ) : (
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4 fluent-shadow">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome to FLUX
          </h2>
          <p className="text-muted-foreground">
            Sign in to share your thoughts and connect with others
          </p>
          <SignInButton mode="modal">
            <Button className="bg-primary hover:bg-primary/90">Sign In</Button>
          </SignInButton>
        </div>
      )}

      {/* 
        FEED SECTION:
        - Displays paginated posts
        - Works for both authenticated and unauthenticated users
        - Unauthenticated can view but can't like/comment
      */}
      <Feed />

      {/* 
        WHO TO FOLLOW SIDEBAR (Right column on desktop):
        - Only shows on large screens (responsive)
        - Sticky positioning keeps it visible while scrolling
        - Recommend users based on follow graph
      */}
      <div className="hidden lg:block">
        <WhoToFollow />
      </div>
    </div>
  );
}
