import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    watch: {
      usePolling: false,
      ignored: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.glb",
        "**/*.gltf",
        "**/src/assetsEnum.ts",
      ],
    },
  },
  build: {
    target: "esnext",
    minify: "terser",
    sourcemap: false,
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          tween: ["@tweenjs/tween.js"],
        },
        assetFileNames: (assetInfo) => {
          // Копіюємо всі assets в папку assets
          return "assets/[name].[ext]";
        },
        chunkFileNames: "assets/[name].js",
        entryFileNames: "assets/[name].js",
      },
    },
    assetsInlineLimit: 0, // Don't inline any assets
  },
  assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.bin", "**/*.jpg", "**/*.png"],
});
