SynkDocs

SynkDocs is a real-time collaborative document editor inspired by Google Docs. It enables multiple users to edit the same document simultaneously with live cursors, presence indicators, comments, and version history. The application is built using a modern full-stack architecture with a strong focus on real-time collaboration, scalability, and clean system design.

This project is designed as an advanced MVP to demonstrate real-world engineering concepts such as WebSocket communication, conflict-free data synchronization, and collaborative user experiences.

Features

Real-time collaborative document editing

Live cursors and user presence indicators

Conflict-free synchronization using CRDTs (Yjs)

Rich text editor with formatting support

Threaded comments and discussions

Document version history with restore capability

Role-based access (owner, editor, viewer)

Responsive and clean user interface

Tech Stack
Frontend

Next.js (App Router)

TypeScript

Tailwind CSS

TipTap Editor

Yjs (CRDT)

Backend

Node.js

TypeScript

WebSockets

Database & Auth

Supabase (PostgreSQL)

Supabase Authentication

Deployment

Frontend: Vercel (free tier)

WebSocket Server: Fly.io (free tier)

Database & Auth: Supabase (free tier)

Architecture Overview

SynkDocs uses a distributed real-time architecture where document updates are synchronized across clients using WebSockets and CRDTs. Yjs ensures that concurrent edits are merged automatically without conflicts, even when multiple users edit the same content at the same time. The backend WebSocket server manages document rooms and broadcasts updates, while Supabase handles authentication, persistence, and access control.

Getting Started
Prerequisites

Node.js (v18 or later)

npm or pnpm

Supabase account (free tier)

Installation
git clone https://github.com/your-username/synkdocs.git
cd synkdocs
npm install

Environment Variables

Create a .env.local file and add:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_WS_URL=your_websocket_server_url

Run Locally
npm run dev