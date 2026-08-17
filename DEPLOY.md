Mehfil-e-Ghazal Deployment Guide

Overview
- Frontend: Vite app (repo root) → Deploy to Vercel
- WebSocket backend: presence-server.js (repo root) → Deploy to Render as a Web Service

Repository layout
- Frontend (Vite): index.html, src (if present), public/assets, package.json scripts (build, dev, preview)
- Backend (WebSocket): presence-server.js (entry), wah_count.json (persistence)

Frontend (Vercel)
1. In Vercel, import your GitHub repo.
2. Project root: the repository root (leave as default if your app is at repo root).
3. Build Command: npm run build
4. Output Directory: dist
5. Environment Variables (Production):
   - VITE_MEHFIL_WS_URL=wss://<your-render-service>.onrender.com
   (Optional: set same for Preview environment if you want preview deployments to connect to presence)
6. Deploy. Vercel will run npm install and npm run build, producing dist/ which will be served as static site.

Backend (Render)
1. Create a new Web Service on Render.
2. Connect your GitHub repo and select the repository.
3. Root Directory: repository root (presence-server.js located there)
4. Runtime: Node
5. Build Command: npm install
6. Start Command: npm start
7. Environment (optional): none required. The server uses process.env.PORT assigned by Render.
8. Deploy. After deploy the service public URL will be available (e.g., mehfil-e-ghazal.onrender.com).

Important environment variable
- VITE_MEHFIL_WS_URL=wss://<render-service-domain>
  - Set this in Vercel project settings for Production (and Preview if desired).
  - Do NOT hardcode this value in source; Vite will embed it at build time.
  - For local development, you can test with ws://localhost:3001 by leaving the env unset and running presence-server locally.

CORS / WebSocket origin
- presence-server.js exposes an HTTP health endpoint that returns Access-Control-Allow-Origin: *.
- WebSocket upgrade does not enforce origin checks currently. If you need to restrict origins, add a whitelist check for req.headers.origin and only accept connections from your Vercel origin and localhost.

Verification checklist
- Deploy backend to Render and note the service domain.
- Set VITE_MEHFIL_WS_URL in Vercel to wss://<render-service-domain> and redeploy Vercel.
- Open two browsers to the Vercel site and verify:
  - WebSocket connection uses wss://<render-service-domain> (Network → WS shows 101)
  - Online count synchronizes when pages open/close
  - Wah count increments by 1 when clicking Wah and syncs to all clients
  - Audio, artwork, background, themes unchanged

Notes
- The repo uses a single package.json at repo root; both frontend and backend share the file. Render will run npm start which starts presence-server.js. Vercel will run npm run build to produce static files for deployment.
- Do not scale the backend to multiple instances without adding centralized persistence for wah_count.json; otherwise each instance will have its own memory state.

Contact
- If you want me to add an optional origin whitelist or deploy the Render service for you, say so and provide Render/GitHub access as needed.