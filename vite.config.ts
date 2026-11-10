// Build config. Technical choices are recorded in build/build-log.md.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves the site under /<repo name>/.
const base = process.env.PAGES_BASE ?? "/WorldBuilder/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-180.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "WorldBuilder",
        short_name: "WorldBuilder",
        description: "Warhammer armies, campaigns and a shared world, on this device.",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#1b1a17",
        theme_color: "#1b1a17",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,webmanifest}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
