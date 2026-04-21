# ✨ FLUX - Full-Stack Social Media Platform

> **A modern, feature-rich social media platform built with Next.js 14, Prisma ORM, Neon Postgres, and Clerk authentication. Designed with the Windows 11 Fluent Design System for a premium, native desktop experience.**

## 🎯 Project Overview

FLUX is a production-ready social media application demonstrating **enterprise-grade full-stack engineering** with:

- ⚡ **Server Components & Actions** for optimal performance and security
- 🎨 **Windows 11 Mica Design System** (Light & Dark mode)
- 🔐 **Clerk Authentication** for secure user management
- 💾 **Neon Serverless Postgres** for scalable database
- ✅ **Optimistic UI Updates** for instant user feedback
- 📱 **Fully Responsive** design (mobile-first)
- 🚀 **Production-grade error handling** and validation
- 📊 **Real-time engagement metrics** (likes, comments, followers)

## 📦 Tech Stack

| Category           | Technology    | Version |
| ------------------ | ------------- | ------- |
| **Framework**      | Next.js       | 14.2.25 |
| **Language**       | TypeScript    | 5+      |
| **Styling**        | Tailwind CSS  | 3.4.1   |
| **UI Components**  | Shadcn/UI     | Latest  |
| **Database**       | Neon Postgres | Latest  |
| **ORM**            | Prisma        | 7.3.0   |
| **Authentication** | Clerk         | 6.37.1  |
| **Icons**          | Lucide React  | 0.563.0 |
| **Themes**         | next-themes   | 0.4.6   |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Neon Database account
- Clerk account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/flux.git
   cd flux
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env.local` file:

   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
   CLERK_SECRET_KEY=your_secret

   # Neon Database
   DATABASE_URL=postgresql://user:password@host/db
   DIRECT_URL=postgresql://user:password@host/db
   ```

4. **Setup Database**

   ```bash
   npx prisma migrate dev --name initial
   ```

5. **Start Development**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>

## 🎨 Design System

### Windows 11 Mica Theme

**Light Mode**

- Background: `#f3f3f3`
- Cards: `#ffffff`
- Primary: `#0067c0`

**Dark Mode**

- Background: `#0d0d0d`
- Cards: `#1a1a1a`
- Primary: `#4cc2ff`

Features:

- Backdrop blur effects
- Subtle borders & shadows
- Fluent Design principles
- Responsive typography

## 🎯 Core Features

✅ **Post Management**

- Create posts (280 character limit)
- Optimistic UI updates
- Image upload ready (UploadThing)

❤️ **Engagement**

- Like/unlike posts
- Comment on posts
- Follow/unfollow users
- Real-time notifications

👤 **User Profiles**

- Customizable profiles
- Post history
- Follower/following lists

🌟 **Discovery**

- Who to Follow sidebar
- Friend-of-friends algorithm

## 🏗️ Architecture

### Server Actions (Backend Mutations)

```typescript
"use server";

export async function createPost(content: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const post = await prisma.post.create({
    data: { content, authorId: userId },
    include: { author: true, _count: { select: { likes: true } } },
  });

  revalidatePath("/");
  return post;
}
```

### Optimistic Updates (Frontend)

```typescript
// Update UI immediately, revert if error
setIsLiked(!isLiked);
try {
  await likePost(postId);
} catch (error) {
  setIsLiked(!isLiked); // Revert
}
```

## 📂 Project Structure

```
src/
├── app/                 # Next.js pages
│   ├── page.tsx        # Home feed
│   ├── post/[id]/      # Post detail
│   ├── profile/[user]/ # User profile
│   └── notifications/  # Notifications
├── components/         # React components
│   ├── Feed.tsx
│   ├── Post.tsx
│   ├── CreatePost.tsx
│   └── ui/            # Shadcn components
├── actions/           # Server Actions
│   ├── post.action.ts
│   ├── like.action.ts
│   ├── follow.action.ts
│   └── notification.action.ts
├── db.ts             # Prisma client
└── middleware.ts     # Auth middleware

prisma/
└── schema.prisma     # Database schema
```

## 🛠️ Development Commands

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Type check

npx prisma studio           # Open DB explorer
npx prisma migrate dev      # Create migration
npx prisma generate         # Generate client
```

## 🔐 Security Features

✅ Server-side authentication validation
✅ User ownership verification before mutations
✅ Input validation & sanitization
✅ Encrypted database (Neon)
✅ TypeScript for type safety
✅ Foreign key constraints

## 📈 Performance

⚡ Server Components reduce JavaScript
🎯 Optimistic updates for perceived speed
📊 Efficient database queries with Prisma
🖼️ Image optimization with next/image
🚀 Automatic code splitting

## 📱 Responsive Design

- Mobile: < 640px (full-width)
- Tablet: 640px - 1024px
- Desktop: > 1024px (3-column layout)

## 🎓 Learning Points

This project demonstrates:

- Next.js 14 best practices
- Server Actions pattern
- Optimistic UI updates
- TypeScript patterns
- Prisma ORM usage
- Authentication flows
- Database design
- Windows 11 design system

Perfect for portfolio, interviews, and learning full-stack development.
