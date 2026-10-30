// Runtime settings. Edit this file in the uploaded zip; no rebuild needed.
window.ARCHVIZ_CONFIG = {
  // WebSocket URL of the Pixel Streaming signalling server (player port).
  // Must be wss:// when the page is served over https (e.g. Netcade).
  // Local pages talk to the server directly. Everywhere else (archv3d.com on Cloudflare Pages, *.pages.dev previews,
  // Netcade) goes through the Cloudflare tunnel to the streaming PC at stream.archv3d.com.
  // Can be overridden with ?ss=wss://host in the page URL.
  signallingUrl: /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
    ? 'ws://127.0.0.1:80'
    : 'wss://stream.archv3d.com',
  // Contact form endpoint: the archv3d-contact Worker (contact/ in the repo), which emails each message to Chase.
  contactUrl: 'https://archv3d-contact.james-chase-richards.workers.dev/',
  // Largest stream the browser may request, as 'WIDTHxHEIGHT' (swapped for portrait screens).
  // Bigger windows are streamed at this size and upscaled. Override with ?maxres=1280x720.
  maxStreamResolution: '1920x1080',
  // Landing page heading.
  title: 'archv3d',
  subtitle: 'Interactive architecture, streamed live from Unreal Engine',
  // Levels on the landing page; explore.html?level=<id> opens one. Ids must match
  // AArchVizPlayerController::Levels in Unreal (only those maps can be opened from the browser).
  levels: [
    {
      id: 'studio',
      title: 'Movie Studio',
      subtitle: 'Production campus',
      description: 'A furnished office and studio building on a landscaped hillside, with a courtyard and an overlook trail.',
      image: 'levels/studio.jpg'
    },
    {
      id: 'house',
      title: 'As-Built Residence',
      subtitle: 'Two-storey family home',
      description: 'A furnished house on a wooded lot: living room, kitchen, dining, bedrooms and the back yard patio.',
      image: 'levels/house.jpg'
    }
  ]
};
