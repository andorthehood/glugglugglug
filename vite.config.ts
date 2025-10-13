import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	build: {
		lib: {
			entry: resolve(rootDir, "src/index.ts"),
			name: "GlugGlugGlug",
			fileName: (format) => `glugglugglug.${format}.js`,
			formats: ["es", "umd"]
		},
		rollupOptions: {
			// Expose the library without bundling dependencies so consumers manage their own versions.
			external: [],
			output: {
				globals: {}
			}
		}
	}
});
