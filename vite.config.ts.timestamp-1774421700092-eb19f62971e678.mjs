// vite.config.ts
import { defineConfig } from "file:///D:/Fox3-main/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Fox3-main/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import obfuscator from "file:///D:/Fox3-main/node_modules/rollup-plugin-javascript-obfuscator/dist/rollup-plugin-javascript-obfuscator.cjs.js";
var __vite_injected_original_dirname = "D:\\Fox3-main";
var vite_config_default = defineConfig(() => ({
  base: "/",
  server: {
    host: "::",
    port: 8080
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      plugins: [
        obfuscator({
          include: ["**/src/main.tsx", "**/src/integrations/supabase/**/*.ts", "**/src/integrations/supabase/**/*.tsx"],
          options: {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1,
            numbersToExpressions: true,
            simplify: true,
            stringArrayShuffle: true,
            splitStrings: true,
            stringArrayThreshold: 1,
            stringArrayEncoding: ["base64"]
          }
        })
      ]
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxGb3gzLW1haW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXEZveDMtbWFpblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovRm94My1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG4vLyBAdHMtZXhwZWN0LWVycm9yIC0gTm8gb2ZmaWNpYWwgdHlwZXNjcmlwdCBkZWZpbml0aW9ucyBhdmFpbGFibGUgZm9yIHRoaXMgcm9sbHVwIHBsdWdpblxyXG5pbXBvcnQgb2JmdXNjYXRvciBmcm9tIFwicm9sbHVwLXBsdWdpbi1qYXZhc2NyaXB0LW9iZnVzY2F0b3JcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoKSA9PiAoe1xyXG4gIGJhc2U6IFwiL1wiLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBwbHVnaW5zOiBbXHJcbiAgICAgICAgb2JmdXNjYXRvcih7XHJcbiAgICAgICAgICBpbmNsdWRlOiBbJyoqL3NyYy9tYWluLnRzeCcsICcqKi9zcmMvaW50ZWdyYXRpb25zL3N1cGFiYXNlLyoqLyoudHMnLCAnKiovc3JjL2ludGVncmF0aW9ucy9zdXBhYmFzZS8qKi8qLnRzeCddLFxyXG4gICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICBjb21wYWN0OiB0cnVlLFxyXG4gICAgICAgICAgICBjb250cm9sRmxvd0ZsYXR0ZW5pbmc6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbnRyb2xGbG93RmxhdHRlbmluZ1RocmVzaG9sZDogMSxcclxuICAgICAgICAgICAgbnVtYmVyc1RvRXhwcmVzc2lvbnM6IHRydWUsXHJcbiAgICAgICAgICAgIHNpbXBsaWZ5OiB0cnVlLFxyXG4gICAgICAgICAgICBzdHJpbmdBcnJheVNodWZmbGU6IHRydWUsXHJcbiAgICAgICAgICAgIHNwbGl0U3RyaW5nczogdHJ1ZSxcclxuICAgICAgICAgICAgc3RyaW5nQXJyYXlUaHJlc2hvbGQ6IDEsXHJcbiAgICAgICAgICAgIHN0cmluZ0FycmF5RW5jb2Rpbmc6IFsnYmFzZTY0J10sXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgXVxyXG4gICAgfVxyXG4gIH1cclxufSkpO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBOLFNBQVMsb0JBQW9CO0FBQ3ZQLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFFakIsT0FBTyxnQkFBZ0I7QUFKdkIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLE9BQU87QUFBQSxFQUNqQyxNQUFNO0FBQUEsRUFDTixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFNBQVM7QUFBQSxRQUNQLFdBQVc7QUFBQSxVQUNULFNBQVMsQ0FBQyxtQkFBbUIsd0NBQXdDLHVDQUF1QztBQUFBLFVBQzVHLFNBQVM7QUFBQSxZQUNQLFNBQVM7QUFBQSxZQUNULHVCQUF1QjtBQUFBLFlBQ3ZCLGdDQUFnQztBQUFBLFlBQ2hDLHNCQUFzQjtBQUFBLFlBQ3RCLFVBQVU7QUFBQSxZQUNWLG9CQUFvQjtBQUFBLFlBQ3BCLGNBQWM7QUFBQSxZQUNkLHNCQUFzQjtBQUFBLFlBQ3RCLHFCQUFxQixDQUFDLFFBQVE7QUFBQSxVQUNoQztBQUFBLFFBQ0YsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
