# Chatify

A real-time chat application built with Next.js 16, React 19, and TypeScript.

## Features

- **Real-time messaging** — Instant message delivery via WebSocket (Apinator)
- **Rich media sharing** — Send images, videos, voice messages, and files with inline upload progress
- **Telegram-style bubbles** — Chat bubbles with tails, timestamps, and status indicators
- **Read receipts** — Single check (sent), double check (read) on messages and conversation list
- **Typing indicators** — iMessage-style bouncing dots when the other person is typing
- **Voice messages** — Record and send audio with a waveform player
- **Reply, edit, delete, copy, forward** — Full message actions via context menu
- **Link previews** — Auto-generated previews for URLs shared in chat
- **Online presence** — See who's online in real-time
- **Notifications** — Real-time notification bell with unread count (no polling)
- **Unread badges** — Per-conversation unread message count on the chat list
- **File uploads** — Drag-and-drop or attach images, video, audio, PDFs, and documents (via UploadThing)
- **Email verification** — Verify your email on signup via Resend
- **Forgot password** — Password reset flow with email link
- **Profile avatars** — Upload and update your profile picture
- **Skeleton loading** — Smooth loading states for conversation list and chat messages
- **Mobile responsive** — Full-screen chat on mobile with back navigation
- **Image lightbox** — Click to view images full-screen

## Tech Stack

- **Framework** — Next.js 16 + React 19
- **Database** — PostgreSQL via Prisma ORM 7 (Prisma Accelerate)
- **Auth** — NextAuth 4 (JWT)
- **Real-time** — Apinator WebSocket SDK
- **File uploads** — UploadThing
- **Email** — Resend
- **Styling** — Tailwind CSS 4

## Getting Started

1. Clone the repo and install dependencies:
   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```
   DATABASE_URL=
   AUTH_SECRET=
   APINATOR_APP_ID=
   APINATOR_SECRET_KEY=
   NEXT_PUBLIC_APINATOR_KEY=
   NEXT_PUBLIC_APINATOR_CLUSTER=
   UPLOADTHING_TOKEN=
   RESEND_API_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Run database migrations and start the dev server:
   ```bash
   pnpm exec prisma migrate deploy
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)
