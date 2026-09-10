import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import https from 'https';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const WAH_FILE = './wah_count.json';

// ─── Hard Floor ─────────────────────────────────────────────────────────────
// The count can NEVER drop below this value under any circumstances.
// Update this whenever a new known-highest-count is confirmed.
const HARD_FLOOR = 1596;

// ─── Remote Persistent Counter Store ────────────────────────────────────────
// CountAPI (countapi.mileshilliard.com) persists across Render restarts, sleeps, redeploys.
// Key: mehfil_ghazal_universal_wah_2026
const REMOTE_BASE = 'https://countapi.mileshilliard.com/api/v1';
const REMOTE_KEY = 'mehfil_ghazal_universal_wah_2026';

// ─── Global WAH Counter (in-memory, authoritative during runtime) ────────────
let globalWahCount = HARD_FLOOR;
let serverReady = false;  // True after startup hydration completes

// ─── Local Disk Persistence ──────────────────────────────────────────────────
function loadLocalWahCount() {
    try {
        if (fs.existsSync(WAH_FILE)) {
            const saved = JSON.parse(fs.readFileSync(WAH_FILE, 'utf8'));
            if (typeof saved.count === 'number' && !isNaN(saved.count)) {
                return Math.floor(saved.count);
            }
        }
    } catch (e) {
        console.warn('[WAH] Could not load wah_count.json:', e.message);
    }
    return 0;
}

function saveWahCount() {
    try {
        const tmpFile = WAH_FILE + '.tmp';
        fs.writeFileSync(tmpFile, JSON.stringify({ count: globalWahCount }));
        fs.renameSync(tmpFile, WAH_FILE);
    } catch (e) {
        console.warn('[WAH] Could not save wah_count.json:', e.message);
    }
}

// ─── Remote Counter API ──────────────────────────────────────────────────────
function fetchRemoteWahCount(timeoutMs = 5000) {
    return new Promise((resolve) => {
        const url = `${REMOTE_BASE}/get/${REMOTE_KEY}`;
        const timer = setTimeout(() => resolve(null), timeoutMs);
        try {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    clearTimeout(timer);
                    try {
                        const json = JSON.parse(data);
                        if (typeof json.value === 'number') resolve(json.value);
                        else resolve(null);
                    } catch (e) { resolve(null); }
                });
            }).on('error', () => { clearTimeout(timer); resolve(null); });
        } catch (e) { clearTimeout(timer); resolve(null); }
    });
}

function setRemoteWahCount(count) {
    return new Promise((resolve) => {
        const url = `${REMOTE_BASE}/set/${REMOTE_KEY}?value=${count}`;
        const timer = setTimeout(() => resolve(false), 8000);
        try {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    clearTimeout(timer);
                    try {
                        const json = JSON.parse(data);
                        if (typeof json.value === 'number') {
                            console.log(`[WAH] Remote store updated to ${json.value}`);
                            resolve(true);
                        } else resolve(false);
                    } catch (e) { resolve(false); }
                });
            }).on('error', () => { clearTimeout(timer); resolve(false); });
        } catch (e) { clearTimeout(timer); resolve(false); }
    });
}

function hitRemoteWahCount() {
    // Use /hit to increment by 1 atomically — this keeps the remote store in sync
    // We don't rely on the returned value; globalWahCount is the authority during runtime.
    const url = `${REMOTE_BASE}/hit/${REMOTE_KEY}`;
    try {
        https.get(url, (res) => {
            res.resume(); // Drain response, ignore body
        }).on('error', () => {});
    } catch (e) {}
}

// ─── Startup Hydration ───────────────────────────────────────────────────────
async function hydrateWahCount() {
    const local = loadLocalWahCount();
    console.log(`[WAH] Local disk count: ${local}`);

    let remote = null;
    try {
        remote = await fetchRemoteWahCount(6000);
        console.log(`[WAH] Remote count: ${remote}`);
    } catch (e) {
        console.warn('[WAH] Remote fetch failed during startup:', e);
    }

    // Set to the maximum of: hard floor, local disk, remote cloud store
    const previous = globalWahCount;
    globalWahCount = Math.max(HARD_FLOOR, local, remote || 0);
    console.log(`[WAH] Hydrated globalWahCount: ${globalWahCount} (floor=${HARD_FLOOR}, local=${local}, remote=${remote})`);

    // If remote was behind, push our value to remote to bring it in sync
    if (remote === null || globalWahCount > remote) {
        console.log(`[WAH] Pushing authoritative count (${globalWahCount}) to remote store...`);
        setRemoteWahCount(globalWahCount).catch(() => {});
    }

    // Always save the authoritative value to local disk
    saveWahCount();

    serverReady = true;

    // Broadcast the authoritative count to any clients who connected during hydration
    broadcastWahCount();

    console.log(`[WAH] Server ready. Authoritative WAH count: ${globalWahCount}`);
}

// ─── HTTP Health Check Endpoint ──────────────────────────────────────────────
const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
        status: 'ok',
        activeConnections: clients.size,
        wahCount: globalWahCount,
        serverReady
    }));
});

const wss = new WebSocketServer({ server });
const clients = new Map();

// ─── Presence Broadcast ──────────────────────────────────────────────────────
function broadcastPresence() {
    const onlineCount = clients.size;
    const payload = JSON.stringify({ type: 'PRESENCE_COUNT', count: onlineCount });
    for (const [, client] of clients.entries()) {
        if (client.ws.readyState === 1) {
            try { client.ws.send(payload); } catch (e) {}
        }
    }
}

// ─── WAH Count Broadcast ─────────────────────────────────────────────────────
function broadcastWahCount(senderConnectionId = null) {
    const payload = JSON.stringify({
        type: 'WAH_COUNT',
        count: globalWahCount,
        senderId: senderConnectionId
    });
    for (const [, client] of clients.entries()) {
        if (client.ws.readyState === 1) {
            try { client.ws.send(payload); } catch (e) {}
        }
    }
}

// ─── Heartbeat ───────────────────────────────────────────────────────────────
setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [id, client] of clients.entries()) {
        if (now - client.lastPing > 15000 || client.ws.readyState > 1) {
            try { client.ws.terminate(); } catch (e) {}
            clients.delete(id);
            changed = true;
        } else {
            try { client.ws.ping(); } catch (e) {}
        }
    }
    if (changed) broadcastPresence();
}, 5000);

// ─── WebSocket Connection Handler ────────────────────────────────────────────
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

    // Replace old socket if this sessionId reconnected
    const existing = clients.get(sessionId);
    if (existing && existing.ws) {
        try { existing.ws.terminate(); } catch (e) {}
    }

    clients.set(sessionId, { ws, lastPing: Date.now(), id: sessionId });
    console.log(`[WS] Client connected: ${sessionId}. Online: ${clients.size}`);

    // Send authoritative initial state to new client
    try {
        ws.send(JSON.stringify({
            type: 'INIT_STATE',
            presenceCount: clients.size,
            wahCount: globalWahCount,
            serverReady
        }));
    } catch (e) {
        console.warn('[WS] INIT_STATE send failed', e);
    }

    broadcastPresence();

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'PING') {
                const client = clients.get(sessionId);
                if (client && client.ws === ws) client.lastPing = Date.now();
                if (ws.readyState === 1) {
                    try { ws.send(JSON.stringify({ type: 'PONG' })); } catch (e) {}
                }

            } else if (data.type === 'INCREMENT_WAH') {
                // ── Atomic server-side increment ──
                globalWahCount = Math.max(globalWahCount + 1, HARD_FLOOR);
                console.log(`[WAH] INCREMENT from ${sessionId}. New count: ${globalWahCount}`);
                saveWahCount();
                hitRemoteWahCount(); // async, fire-and-forget
                broadcastWahCount(sessionId);

            } else if (data.type === 'RECONCILE_WAH') {
                // ── Client reports a higher count than server has (e.g. after Render restart) ──
                const clientCount = typeof data.count === 'number' ? Math.floor(data.count) : 0;
                if (clientCount > globalWahCount) {
                    console.log(`[WAH] RECONCILE: client ${sessionId} reported ${clientCount} > server ${globalWahCount}. Healing.`);
                    globalWahCount = clientCount;
                    saveWahCount();
                    setRemoteWahCount(globalWahCount).catch(() => {});
                    broadcastWahCount(sessionId);
                }
            }
        } catch (e) {
            console.warn('[WS] message parse error', e);
        }
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
            console.warn(`[WS] Client error: ${sessionId}`, err.message);
            broadcastPresence();
        }
    });
});

// ─── Start Server ────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Presence Server] WebSocket listening on 0.0.0.0:${PORT}`);
    console.log(`[WAH] Beginning startup hydration...`);
    hydrateWahCount().catch(e => {
        console.warn('[WAH] Hydration error (non-fatal):', e);
        serverReady = true;
        saveWahCount();
    });
});
