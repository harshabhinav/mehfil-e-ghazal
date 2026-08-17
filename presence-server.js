import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const WAH_FILE = './wah_count.json';

// Global Atomic WAH Counter (Persisted to disk)
let globalWahCount = 0;
try {
    if (fs.existsSync(WAH_FILE)) {
        const saved = JSON.parse(fs.readFileSync(WAH_FILE, 'utf8'));
        if (typeof saved.count === 'number') {
            globalWahCount = saved.count;
        }
    }
} catch (e) {
    console.warn("Could not load wah_count.json, using default:", e);
}

function saveWahCount() {
    try {
        fs.writeFileSync(WAH_FILE, JSON.stringify({ count: globalWahCount }));
    } catch (e) {}
}

// HTTP Health Check Endpoint
const server = http.createServer((req, res) => {
    res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ status: 'ok', activeConnections: clients.size, wahCount: globalWahCount }));
});

const wss = new WebSocketServer({ server });
const clients = new Map();

function broadcastPresence() {
    const onlineCount = clients.size;
    const payload = JSON.stringify({
        type: 'PRESENCE_COUNT',
        count: onlineCount
    });
    for (const [id, client] of clients.entries()) {
        if (client.ws.readyState === 1) { // OPEN
            client.ws.send(payload);
        }
    }
}

function broadcastWahCount(senderConnectionId = null) {
    const payload = JSON.stringify({
        type: 'WAH_COUNT',
        count: globalWahCount,
        senderId: senderConnectionId
    });
    for (const [id, client] of clients.entries()) {
        if (client.ws.readyState === 1) { // OPEN
            client.ws.send(payload);
        }
    }
}

// Heartbeat ping interval to prune dead/disconnected sockets
setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [id, client] of clients.entries()) {
        if (now - client.lastPing > 15000 || client.ws.readyState > 1) {
            try { client.ws.terminate(); } catch(e) {}
            clients.delete(id);
            changed = true;
        } else {
            try { client.ws.ping(); } catch(e) {}
        }
    }
    if (changed) {
        broadcastPresence();
    }
}, 5000);

wss.on('connection', (ws, req) => {
    let sessionId = null;
    try {
        if (req && req.url) {
            const urlObj = new URL(req.url, 'http://localhost');
            sessionId = urlObj.searchParams.get('sessionId');
        }
    } catch (e) {}

    if (!sessionId) {
        sessionId = 'conn_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    }

    // Replace old socket if this sessionId reconnected/refreshed
    const existing = clients.get(sessionId);
    if (existing && existing.ws) {
        try {
            existing.ws.terminate();
        } catch (e) {}
    }

    clients.set(sessionId, { ws, lastPing: Date.now(), id: sessionId });
    console.log(`[WS] Client connected: ${sessionId}. Online: ${clients.size}`);

    // Send current initial state (presence + shared global WAH count) to new client
    try {
        ws.send(JSON.stringify({
            type: 'INIT_STATE',
            presenceCount: clients.size,
            wahCount: globalWahCount
        }));
    } catch (e) { console.warn('[WS] INIT_STATE send failed', e); }

    // Broadcast updated presence to all clients
    broadcastPresence();

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'PING') {
                const client = clients.get(sessionId);
                if (client && client.ws === ws) client.lastPing = Date.now();
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({ type: 'PONG' }));
                }
            } else if (data.type === 'INCREMENT_WAH') {
                console.log('[WS] Wah received from', sessionId);
                // Atomic Server Increment
                globalWahCount += 1;
                try { saveWahCount(); } catch(e) { console.warn('[WS] saveWahCount failed', e); }
                console.log('[WS] Wah count:', globalWahCount, ' Broadcasting to', clients.size, 'clients');
                broadcastWahCount(sessionId);
            } else {
                // Unknown message type - ignore
            }
        } catch (e) { console.warn('[WS] message parse error', e); }
    });

    ws.on('pong', () => {
        const client = clients.get(sessionId);
        if (client && client.ws === ws) client.lastPing = Date.now();
    });

    ws.on('close', () => {
        const current = clients.get(sessionId);
        if (current && current.ws === ws) {
            clients.delete(sessionId);
            console.log(`[WS] Client disconnected: ${sessionId}. Online: ${clients.size}`);
            broadcastPresence();
        }
    });

    ws.on('error', (err) => {
        const current = clients.get(sessionId);
        if (current && current.ws === ws) {
            clients.delete(sessionId);
            console.warn(`[WS] Client error: ${sessionId}`, err);
            broadcastPresence();
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Presence Server] Realtime WebSocket listening on 0.0.0.0:${PORT} (Global WAH: ${globalWahCount})`);
});
