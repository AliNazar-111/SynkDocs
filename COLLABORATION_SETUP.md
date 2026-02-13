# Real-Time Collaboration Setup Guide

Complete guide to setting up real-time collaboration in SynkDocs.

---

## Prerequisites

- ✅ Supabase project configured
- ✅ PostgreSQL tables created (see `WEBSOCKET_ARCHITECTURE.md`)
- ✅ RLS policies enabled
- ✅ Node.js 18+ installed

---

## Part 1: WebSocket Server Setup

### 1. Navigate to WebSocket Server Directory

```bash
cd apps/websocket-server
```

### 2. Install Dependencies

```bash
npm install
```

Installs:
- `yjs` - CRDT library
- `y-websocket` - WebSocket server for Yjs
- `@supabase/supabase-js` - Supabase client
- `ws` - WebSocket library
- `dotenv` - Environment variables

### 3. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Update with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
WSS_PORT=1234
NODE_ENV=development
```

**⚠️ Important**: Use the **Service Role Key**, not the Anon Key, as the server needs to validate tokens.

### 4. Create Required Supabase Function

Run this SQL in your Supabase SQL Editor:

```sql
-- Function to check document access (already provided in RLS section)
CREATE OR REPLACE FUNCTION user_has_document_access(
  doc_id UUID,
  user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = doc_id
      AND d.deleted_at IS NULL
      AND (
        d.owner_id = user_id
        OR EXISTS (
          SELECT 1 FROM document_collaborators dc
          WHERE dc.document_id = doc_id
            AND dc.user_id = user_id
        )
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 5. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

You should see:
```
🚀 Starting SynkDocs WebSocket Server...
✅ WebSocket server running on ws://localhost:1234
🎉 SynkDocs WebSocket Server is ready!
```

---

## Part 2: Frontend Integration

### 1. Install Client Dependencies

Already done! The following packages are installed:
- `yjs`
- `y-websocket`
- `y-protocols`

### 2. Update Environment Variables

Your `apps/web/.env.local` should already have:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_WS_URL=ws://localhost:1234
```

**For Production**: Change to `wss://your-websocket-server.com`

### 3. Wrap Your Document Page

Update `apps/web/src/app/documents/[id]/page.tsx`:

```typescript
import { CollaborationProvider } from '@/components/providers/CollaborationProvider';

export default function DocumentPage({ params }: { params: { id: string } }) {
  return (
    <CollaborationProvider documentId={params.id}>
      {/* Your editor component */}
      <DocumentEditor documentId={params.id} />
    </CollaborationProvider>
  );
}
```

### 4. Use Collaboration Hooks in Your Editor

See `COLLABORATION_EXAMPLE.tsx` for a complete example with TipTap.

Basic usage:

```typescript
import { useCollaboration } from '@/components/providers/CollaborationProvider';
import { useAutoSave } from '@/hooks/useAutoSave';
import { usePresence } from '@/hooks/usePresence';

function MyEditor({ documentId }: { documentId: string }) {
  const { ydoc, isConnected, isSynced } = useCollaboration();
  const { save } = useAutoSave({ documentId, title: 'My Doc' });
  const { users } = usePresence();

  // Your editor setup here...
}
```

---

## Part 3: Testing the Setup

### 1. Start All Servers

**Terminal 1 - Frontend**:
```bash
cd apps/web
npm run dev
```

**Terminal 2 - WebSocket Server**:
```bash
cd apps/websocket-server
npm run dev
```

### 2. Test Collaboration

1. Open `http://localhost:3001` in Browser A
2. Open `http://localhost:3001` in Browser B (incognito)
3. Navigate to the same document in both browsers
4. Edit in Browser A → should appear in Browser B instantly
5. Check WebSocket server logs for connection events

### 3. Expected Server Logs

```
✅ User user@example.com connected to document:abc-123 (45ms) - Active users: 1
✅ User user2@example.com connected to document:abc-123 (38ms) - Active users: 2
📝 Document document:abc-123 updated (2 active users)
👋 User user@example.com disconnected from document:abc-123 - Remaining users: 1
⏳ Scheduling destruction of room: document:abc-123 (30000ms)
```

---

## Part 4: Features

### Auto-Save

Automatically saves to Supabase:
- Every 30 seconds (debounced)
- After 50 significant edits
- On page close (using `sendBeacon`)

### Presence Awareness

Track active users:
```typescript
const { users } = usePresence();

// users = [
//   { id: '...', email: 'user@example.com', color: '#f86734' }
// ]
```

### Connection Status

```typescript
const { isConnected, isSynced, error } = useCollaboration();

if (!isConnected) {
  // Show "Offline" indicator
}

if (error) {
  // Show error message
}
```

### Manual Save

```typescript
const { save } = useAutoSave({ documentId, title });

// Trigger on Ctrl+S
useKeyboardShortcuts({
  key: 's',
  ctrl: true,
  callback: () => save(),
});
```

---

## Part 5: Deployment

### WebSocket Server Deployment

**Recommended Platforms**:
- **Railway** (Free tier: 512MB RAM, $5 credit/month)
- **Render** (Free tier: 512MB RAM)
- **Fly.io** (Free tier: 3 shared CPUs, 256MB RAM)

**Example: Railway Deployment**

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
cd apps/websocket-server
railway login
railway init
railway up
```

3. Set environment variables in Railway dashboard:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
WSS_PORT=1234
NODE_ENV=production
```

4. Get your deployment URL (e.g., `wss://synkdocs-ws.railway.app`)

5. Update frontend `.env.production`:
```env
NEXT_PUBLIC_WS_URL=wss://synkdocs-ws.railway.app
```

### Frontend Deployment

Already configured! Just deploy to Vercel:

```bash
cd apps/web
vercel --prod
```

---

## Part 6: Monitoring

### Health Check

Add to `server.js` (optional):

```javascript
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: rooms.size,
    activeConnections: wss.clients.size,
  });
});

app.listen(3000, () => {
  console.log('Health check endpoint: http://localhost:3000/health');
});
```

### Logs

Server logs important events:
- ✅ User connections
- 👋 User disconnections
- 📂 Room creation
- 🗑️ Room destruction
- 📝 Document updates

---

## Part 7: Troubleshooting

### Connection Fails

**Error**: `Authentication token required`
- **Fix**: Ensure token is passed in WebSocket URL

**Error**: `Permission denied`
- **Fix**: Check user has access via Supabase RLS

**Error**: `Invalid room name`
- **Fix**: Room must start with `document:`

### Auto-Save Not Working

- Check browser console for errors
- Verify Supabase credentials in `.env.local`
- Check RLS policies allow UPDATE

### Users Can't See Each Other's Edits

- Verify both users connected to same room
- Check WebSocket server logs for connections
- Ensure `y-websocket` setup is correct

### Server Crashes

- Check memory usage (< 512MB for free tier)
- Implement room cleanup (already done)
- Monitor active connections

---

## Part 8: Security Checklist

✅ **WebSocket Server**:
- [x] JWT validation on every connection
- [x] Document access check via Supabase RPC
- [x] Service role key stored in environment variables
- [x] Room isolation (users can't join unauthorized rooms)

✅ **Frontend**:
- [x] Anon key used (not service role key)
- [x] RLS policies enforced on Supabase operations
- [x] Token passed securely in WebSocket URL
- [x] No sensitive data in client code

✅ **Database**:
- [x] RLS enabled on all tables
- [x] Permission checks in policies
- [x] Service role only used server-side

---

## Part 9: Performance Optimization

### Reduce Memory Usage

```javascript
// In server.js, enable garbage collection
const doc = new Y.Doc({ gc: true });
```

### Compress Updates (Optional)

```javascript
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// Compress Yjs updates before broadcasting
```

### Limit Room Size

```javascript
if (room.connections.size >= 50) {
  conn.close(4000, 'Room is full');
  return;
}
```

---

## Part 10: Next Steps

1. ✅ **Set up WebSocket server** → localhost testing
2. ✅ **Test collaboration** → two browser windows
3. ⬜ **Deploy WebSocket server** → Railway/Render
4. ⬜ **Update frontend env vars** → production WebSocket URL
5. ⬜ **Deploy frontend** → Vercel
6. ⬜ **Test in production** → real user testing
7. ⬜ **Monitor metrics** → logs, memory usage
8. ⬜ **Optional: Add Redis** → horizontal scaling

---

## Quick Start Commands

```bash
# Terminal 1: Start WebSocket Server
cd apps/websocket-server
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev

# Terminal 2: Start Frontend
cd apps/web
npm run dev

# Open in browser
open http://localhost:3001
```

---

## Support

- WebSocket Architecture: `WEBSOCKET_ARCHITECTURE.md`
- Supabase Integration: `SUPABASE_INTEGRATION.md`
- Example Code: `COLLABORATION_EXAMPLE.tsx`

Happy collaborating! 🚀
