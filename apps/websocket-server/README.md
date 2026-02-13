# WebSocket Server for SynkDocs

Real-time collaboration server using Yjs and WebSocket.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WSS_PORT=1234
NODE_ENV=development
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Features

- ✅ JWT authentication via Supabase
- ✅ Document-level access control
- ✅ Automatic room cleanup (30s after last user leaves)
- ✅ Connection tracking and monitoring
- ✅ Graceful shutdown
- ✅ Error handling

## Architecture

- **Port**: 1234 (configurable via `WSS_PORT`)
- **Protocol**: WebSocket
- **Room Format**: `document:{documentId}`
- **Authentication**: JWT token in query params

## Connection URL Format

```
ws://localhost:1234?token={JWT_TOKEN}&room=document:{DOCUMENT_ID}
```

## Monitoring

Server logs connection events:
- User connections/disconnections
- Room creation/destruction
- Active user counts
- Document updates

## Security

- Validates JWT tokens with Supabase
- Checks document access permissions via RLS
- Rejects unauthorized connections
- Service role key never exposed to clients

## Scaling

For horizontal scaling, integrate Redis adapter:
```javascript
import { RedisPersistence } from 'y-redis';
```

See `WEBSOCKET_ARCHITECTURE.md` for details.
