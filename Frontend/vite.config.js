import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-charts": ["chart.js", "react-chartjs-2", "recharts"],
          "vendor-motion": ["framer-motion"],
          "vendor-icons": ["react-icons", "lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
