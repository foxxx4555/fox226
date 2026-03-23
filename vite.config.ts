import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// @ts-expect-error - No official typescript definitions available for this rollup plugin
import obfuscator from "rollup-plugin-javascript-obfuscator";

export default defineConfig(() => ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      plugins: [
        obfuscator({
          include: ['**/src/main.tsx', '**/src/integrations/supabase/**/*.ts', '**/src/integrations/supabase/**/*.tsx'],
          options: {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1,
            numbersToExpressions: true,
            simplify: true,
            stringArrayShuffle: true,
            splitStrings: true,
            stringArrayThreshold: 1,
            stringArrayEncoding: ['base64'],
          }
        })
      ]
    }
  }
}));
