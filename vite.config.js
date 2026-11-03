import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths allow the same build to work at a GitHub Pages
  // repository subpath as well as at a Vercel/custom-domain root.
  base: "./",
  plugins: [react()],
  server: { host: true },
});
