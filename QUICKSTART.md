# Quick Start: Run SynkDocs Locally

Get SynkDocs running in under 5 minutes!

## Prerequisites

- Node.js 18+
- Supabase account (free tier works!)

---

## Step 1: Clone & Install

```bash
# Install frontend dependencies
cd apps/web
npm install

# Install WebSocket server dependencies
cd ../websocket-server
npm install
```

---

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for database to provision (~2 minutes)
3. Go to **SQL Editor** and run the SQL from `docs/database-schema.sql`
4. Go to **Settings** → **API** and copy:
   - Project URL
   - Anon Public Key
   - Service Role Key

---

## Step 3: Configure Environment

### Frontend (`apps/web/.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_WS_URL=ws://localhost:1234
```

### WebSocket Server (`apps/websocket-server/.env`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
WSS_PORT=1234
NODE_ENV=development
```

---

## Step 4: Start Everything

**Terminal 1 - WebSocket Server:**
```bash
cd apps/websocket-server
npm run dev
```

You should see:
```
✅ WebSocket server running on ws://localhost:1234
🎉 SynkDocs WebSocket Server is ready!
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3001
```

---

## Step 5: Test It Out!

1. Open `http://localhost:3001`
2. Sign up for an account
3. Create a new document
4. Open another browser (or incognito) and sign in as a different user
5. Open the same document
6. Start typing - you should see changes in real-time! ✨

---

## What's Running?

| Service | Port | Purpose |
|---------|------|---------|
| **Next.js Frontend** | 3001 | UI & Auth |
| **WebSocket Server** | 1234 | Real-time collaboration |
| **Supabase** | Cloud | Database & Auth |

---

## Troubleshooting

### "Connection failed" in browser

- Make sure WebSocket server is running (`Terminal 1`)
- Check that `NEXT_PUBLIC_WS_URL=ws://localhost:1234` is set

### "Authentication required"

- Verify Supabase credentials in `.env.local`
- Check you're logged in

### "Permission denied"

- Run the SQL migrations in Supabase
- Check RLS policies are enabled

---

## Next Steps

- ✅ Read `COLLABORATION_SETUP.md` for detailed setup
- ✅ Check `SUPABASE_INTEGRATION.md` for API usage
- ✅ See `WEBSOCKET_ARCHITECTURE.md` for architecture details

Happy coding! 🚀
