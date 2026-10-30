// Runtime settings. Edit this file in the uploaded zip; no rebuild needed.
window.ARCHVIZ_CONFIG = {
  // WebSocket URL of the Pixel Streaming signalling server (player port).
  // Must be wss:// when the page is served over https (e.g. Netcade).
  // Local pages talk to the server directly; pages on archv3d.com (or stream.archv3d.com) use their own host;
  // everywhere else (e.g. Netcade) goes through the Cloudflare tunnel at archv3d.com.
  // Can be overridden with ?ss=wss://host in the page URL.
  signallingUrl: /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
    ? 'ws://127.0.0.1:80'
    : /(^|\.)archv3d\.com$/.test(location.hostname)
      ? 'wss://' + location.hostname
      : 'wss://archv3d.com',
  // Largest stream the browser may request, as 'WIDTHxHEIGHT' (swapped for portrait screens).
  // Bigger windows are streamed at this size and upscaled. Override with ?maxres=1280x720.
  maxStreamResolution: '1920x1080',
  title: 'Movie Studio',
  subtitle: 'Interactive architectural experience'
};
