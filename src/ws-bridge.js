// Bridge file: sets a global window.MEHFIL_WS_URL from Vite env at build time
const envWs = import.meta.env.VITE_MEHFIL_WS_URL;
if (envWs && typeof envWs === 'string' && envWs.length) {
  window.MEHFIL_WS_URL = envWs;
  console.info('[WS-BRIDGE] Set window.MEHFIL_WS_URL from Vite env:', envWs);
} else {
  console.info('[WS-BRIDGE] No VITE_MEHFIL_WS_URL provided at build time');
}
