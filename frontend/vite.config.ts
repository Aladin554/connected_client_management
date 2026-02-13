import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/", // Laravel serves from root, not /TailAdmin/
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  build: {
    outDir: "../public/react", // Laravel public folder
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
    "/api": "http://127.0.0.1:8000",
    "/storage": "http://127.0.0.1:8000",
  },
  },
});
