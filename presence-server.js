import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import https from 'https';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const WAH_FILE = './wah_count.json';

// ─── Hard Floor ─────────────────────────────────────────────────────────────
// Priority order (highest wins):
//   1. WAH_COUNT_FLOOR env var (set this on Render when you want to update the floor)
//   2. Hardcoded HARD_FLOOR constant below
//
// To update the floor after a Render redeploy:
//   - Go to Render → Environment → add WAH_COUNT_FLOOR=<latest_count>
//
// This value must be the highest count ever confirmed in production.
const HARD_FLOOR = Math.max(
    1910,
    process.env.WAH_COUNT_FLOOR ? Number(process.env.WAH_COUNT_FLOOR) || 0 : 0
);

// ─── Remote Persistent Counter Store ────────────────────────────────────────
// CountAPI is used ONLY at startup to fetch the stored remote count.
// It is NOT called on every Wah click (prevents rate limiting).
// The server's in-memory counter is authoritative during runtime.
// setRemoteWahCount() is called periodically (every 30 clicks or on shutdown).
const REMOTE_BASE = 'https://countapi.mileshilliard.com/api/v1';
const REMOTE_KEY = 'mehfil_ghazal_universal_wah_2026';

// ─── Global WAH Counter (in-memory, authoritative during runtime) ─────────
let globalWahCount = HARD_FLOOR;
let serverReady = false;
let clicksSinceLastRemoteSync = 0;
const REMOTE_SYNC_INTERVAL = 25; // Push to CountAPI every 25 clicks

// ─── Local Disk Persistence ──────────────────────────────────────────────────
function loadLocalWahCount() {
    try {
        if (fs.existsSync(WAH_FILE)) {
            const raw = fs.readFileSync(WAH_FILE, 'utf8');
            const saved = JSON.parse(raw);
            if (typeof saved.count === 'number' && !isNaN(saved.count) && saved.count > 0) {
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
// fetchRemoteWahCount: used ONCE at startup for hydration
function fetchRemoteWahCount(timeoutMs = 6000) {
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
                        if (typeof json.value === 'number' && !isNaN(json.value) && json.value > 0) {
                            resolve(Math.floor(json.value));
                        } else {
                            resolve(null);
                        }
                    } catch (e) { resolve(null); }
                });
            }).on('error', () => { clearTimeout(timer); resolve(null); });
        } catch (e) { clearTimeout(timer); resolve(null); }
    });
}

// setRemoteWahCount: push the authoritative count to CountAPI (throttled)
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
                            console.log(`[WAH] Remote store synced to ${json.value}`);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    } catch (e) { resolve(false); }
                });
            }).on('error', () => { clearTimeout(timer); resolve(false); });
        } catch (e) { clearTimeout(timer); resolve(false); }
    });
}

// Throttled remote sync: push to CountAPI every REMOTE_SYNC_INTERVAL clicks
// This avoids the rate-limiting issue caused by calling /hit on every single click.
function maybeRemoteSync() {
    clicksSinceLastRemoteSync++;
    if (clicksSinceLastRemoteSync >= REMOTE_SYNC_INTERVAL) {
        clicksSinceLastRemoteSync = 0;
        const snapshot = globalWahCount;
        setRemoteWahCount(snapshot).catch(() => {
            console.warn('[WAH] Background remote sync failed (non-fatal)');
        });
    }
}

// ─── Startup Hydration ───────────────────────────────────────────────────────
// Takes the maximum of: env-var floor, hardcoded floor, disk, and remote.
// This guarantees the count can ONLY ever go forward, never backward.
async function hydrateWahCount() {
    const local = loadLocalWahCount();
    console.log(`[WAH] Disk count: ${local}`);

    let remote = null;
    try {
        remote = await fetchRemoteWahCount(6000);
        console.log(`[WAH] Remote (CountAPI) count: ${remote}`);
    } catch (e) {
        console.warn('[WAH] Remote fetch failed during startup (non-fatal):', e.message || e);
    }

    // Take the maximum of all sources — this is the one and only authoritative count.
    // JavaScript's Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991 — far beyond 1 crore.
    // There is NO upper cap. The count is unlimited.
    globalWahCount = Math.max(
        HARD_FLOOR,
        typeof local === 'number' && local > 0 ? local : 0,
        typeof remote === 'number' && remote > 0 ? remote : 0
    );

    console.log(`[WAH] Hydrated: ${globalWahCount}  (floor=${HARD_FLOOR}, disk=${local}, remote=${remote})`);

    // If remote is behind, push the authoritative count up to CountAPI
    if (typeof remote !== 'number' || globalWahCount > remote) {
        console.log(`[WAH] Pushing ${globalWahCount} to remote store...`);
        setRemoteWahCount(globalWahCount).catch(() => {});
    }

    // Persist to disk
    saveWahCount();

    serverReady = true;
    broadcastWahCount();

    console.log(`[WAH] Server ready. WAH count: ${globalWahCount} (supports up to 1 crore / 10,000,000+)`);
}

// ─── HTTP Health Check / Status Endpoint ─────────────────────────────────────
const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
        status: 'ok',
        activeConnections: clients.size,
        wahCount: globalWahCount,
        serverReady,
        hardFloor: HARD_FLOOR
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

// ─── Heartbeat: prune dead/disconnected sockets ───────────────────────────────
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

// ─── Periodic Remote Sync (every 5 minutes) ───────────────────────────────────
// Ensures CountAPI stays in sync even if the throttled-per-click sync misses some.
setInterval(() => {
    if (serverReady && globalWahCount > HARD_FLOOR) {
        const snapshot = globalWahCount;
        setRemoteWahCount(snapshot).catch(() => {});
    }
}, 5 * 60 * 1000);

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

    // Terminate any stale socket for the same sessionId
    const existing = clients.get(sessionId);
    if (existing && existing.ws) {
        try { existing.ws.terminate(); } catch (e) {}
    }

    clients.set(sessionId, { ws, lastPing: Date.now(), id: sessionId });
    console.log(`[WS] Client connected: ${sessionId}. Online: ${clients.size}`);

    // Send authoritative initial state to the new client
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
                // ── Atomic increment — no upper cap, no limit ──
                // JavaScript Number is a 64-bit float (IEEE 754 double).
                // It can represent integers exactly up to 9,007,199,254,740,991.
                // This is WAY beyond 1 crore (10,000,000). No cap needed.
                globalWahCount = globalWahCount + 1;
                console.log(`[WAH] +1 from ${sessionId} → ${globalWahCount}`);
                saveWahCount();
                maybeRemoteSync(); // Throttled, not on every click
                broadcastWahCount(sessionId);

            } else if (data.type === 'RECONCILE_WAH') {
                // ── Client reports a higher count (self-healing after server restart) ──
                const clientCount = typeof data.count === 'number' && !isNaN(data.count) && data.count > 0
                    ? Math.floor(data.count)
                    : 0;
                if (clientCount > globalWahCount) {
                    console.log(`[WAH] RECONCILE: client=${clientCount} > server=${globalWahCount}. Healing.`);
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

// ─── Graceful Shutdown: sync to remote before exit ───────────────────────────
function gracefulShutdown(signal) {
    console.log(`[WAH] ${signal} received. Final count: ${globalWahCount}. Syncing...`);
    saveWahCount();
    setRemoteWahCount(globalWahCount)
        .then(() => { process.exit(0); })
        .catch(() => { process.exit(0); });
    setTimeout(() => process.exit(0), 5000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Start Server ────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Presence Server] WebSocket listening on 0.0.0.0:${PORT}`);
    console.log(`[WAH] HARD_FLOOR = ${HARD_FLOOR}  |  Max supported = unlimited (up to 9,007,199,254,740,991)`);
    hydrateWahCount().catch(e => {
        console.warn('[WAH] Hydration error (non-fatal):', e);
        serverReady = true;
        broadcastWahCount();
    });
});
