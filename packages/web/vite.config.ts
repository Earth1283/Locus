import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves project sites from /<repo>/, not /. Everything else
// (dev server, `npm run build` for other hosts) stays at root.
const base = process.env.DEPLOY_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // No third-party scripts, no external font/analytics fetches — the
      // service worker only ever serves the app's own bundled assets.
      workbox: {
        // Monaco's editor core is a single large chunk; raise the default
        // 2 MiB precache ceiling so offline mode actually includes it.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: "Locus",
        short_name: "Locus",
        description: "A congruent-triangles proof assistant that augments reasoning, never replaces it.",
        // Relative, not "/" — resolves against wherever the manifest itself
        // is served from, so it's correct at both root and a subpath.
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#14181A",
        theme_color: "#14181A",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    }),
  ],
  build: {
    target: "es2022",
  },
});
