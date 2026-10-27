import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('http://localhost:3003/mask-palette.html');
});

test('uses a transparent depth-free framebuffer through empty frames, resize, and resource restoration', async ({
	page,
}) => {
	const stages = await page.evaluate(async () => {
		const { readContextLifecycle } = await import('./test-cases/mask-palette.ts');
		return readContextLifecycle();
	});
	for (const stage of stages) {
		expect(stage).toMatchObject({
			attributes: { depth: false, antialias: false, alpha: true, premultipliedAlpha: true },
			depthBits: 0,
			pixel: [0, 0, 0, 0],
			error: 0,
		});
	}
});

test('samples odd-width R8 coverage with premultiplied RGBA and updates only palette storage', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { readCoverageFrames } = await import('./test-cases/mask-palette.ts');
		return readCoverageFrames();
	});
	const initial = [100, 50, 25, 128, 0, 0, 0, 0, 50, 25, 13, 64, 0, 0, 0, 0, 50, 25, 13, 64, 100, 50, 25, 128];
	expect(result.initial).toEqual(initial);
	expect(result.updated).toEqual([
		0, 255, 0, 255, 0, 0, 0, 0, 0, 128, 0, 128, 0, 0, 0, 0, 0, 128, 0, 128, 0, 255, 0, 255,
	]);
	expect(result.restored).toEqual(initial);
	expect(result.frameStats).toEqual({ spriteCount: 1, uploadedInstanceBytes: 20 });
	expect(result.errors).toEqual([0, 0, 0]);
});

test('reads palette slot 255 and restores uniform-block bindings after render hooks', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { readPaletteAfterHook } = await import('./test-cases/mask-palette.ts');
		return readPaletteAfterHook();
	});
	expect(result.pixels).toEqual([49, 103, 211, 255]);
	expect(result.error).toBe(0);
});
