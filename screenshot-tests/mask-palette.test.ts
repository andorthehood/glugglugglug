import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('http://localhost:3003/mask-palette.html');
});

test('discards only holes and zero palette alpha, including transparent palette colors', async ({ page }) => {
	const { results, error } = await page.evaluate(async () => {
		const { readAlphaDiscardSamples } = await import('./test-cases/mask-palette.ts');
		return readAlphaDiscardSamples();
	});
	for (const sample of results) {
		expect(sample.passed, `visibility=${sample.visibility}, alpha=${sample.alpha}`).toBe(
			sample.visibility !== 0 && sample.alpha !== 0
		);
	}
	expect(error).toBe(0);
});

test('keeps holes, transparent palette entries, and translucent colors over existing content', async ({ page }) => {
	const { frames, error } = await page.evaluate(async () => {
		const { readVisibilityOverContent } = await import('./test-cases/mask-palette.ts');
		return readVisibilityOverContent();
	});
	for (const { alpha, pixels } of frames) {
		const destination = [20, 40, 80].map(channel => Math.round((channel * alpha) / 255));
		for (const [x, visibility] of [0, 255, 255].entries()) {
			const opacity = ((128 / 255) * visibility) / 255;
			const expected = [200, 100, 50].map((channel, i) =>
				Math.round(channel * opacity + destination[i] * (1 - opacity))
			);
			expected.push(Math.round(255 * opacity + alpha * (1 - opacity)));
			for (let channel = 0; channel < 4; channel++)
				expect(Math.abs(pixels[x * 4 + channel] - expected[channel])).toBeLessThanOrEqual(1);
		}
	}
	expect(error).toBe(0);
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

test('samples odd-width R8 visibility with premultiplied RGBA and updates only palette storage', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { readVisibilityFrames } = await import('./test-cases/mask-palette.ts');
		return readVisibilityFrames();
	});
	const initial = [100, 50, 25, 128, 0, 0, 0, 0, 100, 50, 25, 128, 0, 0, 0, 0, 100, 50, 25, 128, 100, 50, 25, 128];
	expect(result.initial).toEqual(initial);
	expect(result.updated).toEqual([
		0, 255, 0, 255, 0, 0, 0, 0, 0, 255, 0, 255, 0, 0, 0, 0, 0, 255, 0, 255, 0, 255, 0, 255,
	]);
	expect(result.rejected).toBe(true);
	expect(result.afterRejectedAtlas).toEqual(initial);
	expect(result.restored).toEqual(initial);
	expect(result.frameStats).toEqual({ spriteCount: 1, uploadedInstanceBytes: 20 });
	expect(result.errors).toEqual([0, 0, 0, 0]);
});

test('reads palette slot 255 and restores uniform-block bindings after render hooks', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { readPaletteAfterHook } = await import('./test-cases/mask-palette.ts');
		return readPaletteAfterHook();
	});
	expect(result.pixels).toEqual([49, 103, 211, 255]);
	expect(result.error).toBe(0);
});

test('clears after a discard-enabled post hook, including empty and released frames', async ({ page }) => {
	const stages = await page.evaluate(async () => {
		const { readClearAfterDiscardHook } = await import('./test-cases/mask-palette.ts');
		return readClearAfterDiscardHook();
	});
	for (const stage of stages) {
		for (let offset = 0; offset < stage.seeded.length; offset += 4) {
			expect(stage.seeded.slice(offset, offset + 4), stage.name).toEqual([255, 0, 0, 255]);
		}
		expect(
			stage.empty.every(channel => channel === 0),
			stage.name
		).toBe(true);
		if (stage.drawn) {
			for (let offset = 0; offset < stage.drawn.length; offset += 4) {
				expect(stage.drawn.slice(offset, offset + 4), stage.name).toEqual([73, 129, 211, 255]);
			}
		}
		expect(stage.error, stage.name).toBe(0);
	}
});
