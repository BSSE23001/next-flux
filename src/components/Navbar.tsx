import Image from "next/image";
import Link from "next/link";
import React from "react";
import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";
import { currentUser } from "@clerk/nextjs/server";
import { syncUser } from "@/actions/user.action";

/**
 * NAVBAR COMPONENT
 *
 * PURPOSE: Main navigation bar for the application
 *
 * ARCHITECTURE NOTES:
 * - Sticky positioning keeps it visible while scrolling
 * - Sync authenticated users to database (creates user record if first time)
 * - Responsive: Desktop nav on large screens, mobile nav on small
 * - Backdrop blur creates the "Mica" fluent design effect
 *
 * WINDOWS 11 DESIGN:
 * - bg-background/95: Slightly transparent to show content behind
 * - backdrop-blur: The signature Mica frosted glass effect
 * - border-b: Subtle separator between navbar and content
 * - z-50: Stays above all content (high z-index)
 */
async function Navbar() {
  const user = await currentUser();

  // Sync user to database if authenticated
  if (user) {
    await syncUser();
  }

  return (
    <nav
      className={`
        sticky top-0 w-full 
        border-b border-border
        bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
        z-50
        fluent-shadow
      `}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link
              href="/"
              className={`
                flex items-center gap-2
                text-xl font-bold text-primary font-mono tracking-wider
                hover:opacity-80 transition-opacity
              `}
            >
              {/* 
                LOGO RENDERING:
                - Image component for optimization
                - Loads /public/logo.png from static folder
                - Priority loading for above-the-fold content
              */}
              <Image
                src="/logo.png"
                alt="Flux Brand Logo"
                width={100}
                height={18}
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* Desktop navigation (hidden on mobile) */}
          <DesktopNavbar />

          {/* Mobile navigation (hidden on desktop) */}
          <MobileNavbar />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
