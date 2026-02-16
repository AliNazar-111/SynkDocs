import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import { createClient } from '@supabase/supabase-js';

// Configuration
const WSS_PORT = process.env.WSS_PORT || 1234;
const WSS_HOST = process.env.WSS_HOST || '0.0.0.0';

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verify key type on startup
try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
    if (payload.role === 'anon') {
        console.error('❌ CRITICAL ERROR: You are using the ANON_KEY instead of the SERVICE_ROLE_KEY.');
    } else {
        console.log('✅ Supabase Service Role Key validated.');
    }
} catch (e) {
    console.warn('⚠️ Could not validate Supabase key format.');
}

// Track active connections for cleanup/monitoring
const activeConnections = new Map(); // conn -> { user, roomName, checkInterval }

/**
 * Validate user access and document status
 */
async function checkAccessAndStatus(userId, documentId) {
    try {
        const [docResult, accessResult] = await Promise.all([
            supabase
                .from('documents')
                .select('id, deleted_at')
                .eq('id', documentId)
                .single(),
            supabase.rpc('user_has_document_access', {
                doc_id: documentId,
                user_id: userId
            })
        ]);

        const { data: doc, error: docError } = docResult;
        const { data: hasAccess, error: accessError } = accessResult;

        if (docError || !doc) return { error: 'Document not found', code: 4004 };
        if (doc.deleted_at) return { error: 'Document deleted', code: 4004 };
        if (accessError || !hasAccess) return { error: 'Access denied', code: 4003 };

        return { ok: true };
    } catch (error) {
        console.error('Access check failed:', error);
        return { error: 'Check failed', code: 4000 };
    }
}

console.log('Starting SynkDocs WebSocket Server...');

const wss = new WebSocketServer({
    port: WSS_PORT,
    host: WSS_HOST
});

wss.on('connection', async (conn, req) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        // y-websocket puts the room in the pathname
        let roomName = url.pathname.slice(1);
        if (!roomName || roomName === '/') {
            roomName = url.searchParams.get('room');
        }

        if (!token || !roomName || !roomName.startsWith('document:')) {
            console.warn('❌ Invalid connection parameters');
            conn.close(4000, 'Invalid parameters');
            return;
        }

        const documentId = roomName.replace('document:', '');
        const start = Date.now();

        // 0. MESSAGE BUFFERING (CRITICAL FIX)
        // Since we await async auth, we might miss the 'message' event for SyncStep1
        // which the client sends immediately. We buffer them here.
        const messageQueue = [];
        const queueListener = (data, isBinary) => {
            messageQueue.push({ data, isBinary });
        };
        conn.on('message', queueListener);

        // 1. Authenticate User (needed first to get userId for access check)
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !authUser) {
            console.warn(`❌ Auth failed: ${authError?.message || 'Invalid token'}`);
            conn.close(4003, 'Authentication failed');
            return;
        }

        // 2. Initial Access Check
        const status = await checkAccessAndStatus(authUser.id, documentId);
        if (status.error) {
            console.warn(`❌ Access denied for ${authUser.email}: ${status.error}`);
            conn.close(status.code, status.error);
            return;
        }

        console.log(`👤 Connected: ${authUser.email} (Room: ${roomName}) [Setup time: ${Date.now() - start}ms]`);

        // 3. Setup Persistent Check (kick user if permissions removed) - Every 2 minutes
        const checkInterval = setInterval(async () => {
            try {
                if (conn.readyState !== 1) return clearInterval(checkInterval); // 1 = OPEN
                const currentStatus = await checkAccessAndStatus(authUser.id, documentId);
                if (currentStatus.error) {
                    console.warn(`🚪 Kicking ${authUser.email}: ${currentStatus.error}`);
                    conn.close(currentStatus.code, 'Permissions revoked');
                    clearInterval(checkInterval);
                }
            } catch (err) {
                console.error(`❌ Heartbeat check error for ${authUser.email}:`, err);
            }
        }, 120000); // 2 minutes

        activeConnections.set(conn, { user: authUser, roomName, checkInterval });

        // 4. Standard y-websocket setup
        // Remove our buffer listener first so it doesn't duplicate
        conn.removeListener('message', queueListener);

        setupWSConnection(conn, req, { docName: roomName, gc: true });

        // Replay queued messages
        if (messageQueue.length > 0) {
            console.log(`📨 Replaying ${messageQueue.length} buffered messages for ${authUser.email}`);
            for (const { data, isBinary } of messageQueue) {
                conn.emit('message', data, isBinary);
            }
        }

        conn.on('close', (code, reason) => {
            console.log(`🔌 Disconnected: ${authUser.email} (Code: ${code})`);
            clearInterval(checkInterval);
            activeConnections.delete(conn);
        });

    } catch (error) {
        console.error('Unexpected connection error:', error);
        if (conn.readyState === 1) { // OPEN
            conn.close(4000, 'Internal server error');
        }
    }
});

// Stats
setInterval(() => {
    if (activeConnections.size > 0) {
        console.log(`Stats: ${activeConnections.size} connected clients`);
    }
}, 30000);

console.log(`🚀 SynkDocs WebSocket Server is ready on ${WSS_HOST}:${WSS_PORT}\n`);
