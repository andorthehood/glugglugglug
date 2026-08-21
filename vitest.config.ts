import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: false,
		include: ['src/**/*.{test,spec}.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
		testTimeout: 30000,
		hookTimeout: 10000,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'json-summary', 'html'],
			exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts'],
		},
		typecheck: {
			enabled: true,
			tsconfig: './tsconfig.test.json',
		},
	},
});
