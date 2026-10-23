/// <reference types="vite/client" />
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
  },
}
);
