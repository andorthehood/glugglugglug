import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
	const page = await browser.newPage();
	const results = await page.evaluate(() => {
		const definitionCount = 4_096;
		const metadata = new Uint16Array(definitionCount * 4);
		const sprites = new Map();

		for (let id = 0; id < definitionCount; id += 1) {
			const offset = id * 4;
			const width = (id % 31) + 1;
			const height = (id % 23) + 1;
			metadata.set([id % 1024, Math.floor(id / 4), width, height], offset);
			sprites.set(String(id), { id, width, height });
		}

		function median(samples) {
			const sorted = [...samples].sort((left, right) => left - right);
			return sorted[Math.floor(sorted.length / 2)];
		}

		function measure(spriteCount) {
			const storage = new ArrayBuffer(spriteCount * 20);
			const floats = new Float32Array(storage);
			const integers = new Uint32Array(storage);

			function submitWithMap() {
				for (let index = 0; index < spriteCount; index += 1) {
					const publicIdentifier = index % definitionCount;
					const sprite = sprites.get(String(publicIdentifier));
					const offset = index * 5;
					floats[offset] = index % 2048;
					floats[offset + 1] = index % 1024;
					floats[offset + 2] = index % 2 === 0 ? sprite.width : 37;
					floats[offset + 3] = index % 2 === 0 ? sprite.height : 29;
					integers[offset + 4] = sprite.id;
				}
			}

			function submitWithDenseIds() {
				for (let index = 0; index < spriteCount; index += 1) {
					const spriteId = index % definitionCount;
					const metadataOffset = spriteId * 4;
					const offset = index * 5;
					floats[offset] = index % 2048;
					floats[offset + 1] = index % 1024;
					floats[offset + 2] = index % 2 === 0 ? metadata[metadataOffset + 2] : 37;
					floats[offset + 3] = index % 2 === 0 ? metadata[metadataOffset + 3] : 29;
					integers[offset + 4] = spriteId;
				}
			}

			for (let index = 0; index < 20; index += 1) {
				submitWithMap();
				submitWithDenseIds();
			}

			const samples = { map: [], dense: [] };
			const rounds = spriteCount === 10_000 ? 40 : 20;
			const batchIterations = spriteCount === 10_000 ? 50 : 10;
			for (let round = 0; round < rounds; round += 1) {
				const variants =
					round % 2 === 0
						? [
								['map', submitWithMap],
								['dense', submitWithDenseIds],
							]
						: [
								['dense', submitWithDenseIds],
								['map', submitWithMap],
							];
				for (const [name, submit] of variants) {
					const startedAt = performance.now();
					for (let iteration = 0; iteration < batchIterations; iteration += 1) {
						submit();
					}
					samples[name].push((performance.now() - startedAt) / batchIterations);
				}
			}

			submitWithMap();
			const mapBytes = new Uint8Array(storage).slice();
			submitWithDenseIds();
			const denseBytes = new Uint8Array(storage);
			const byteEquivalent = mapBytes.every((value, index) => value === denseBytes[index]);
			const mapMs = median(samples.map);
			const denseMs = median(samples.dense);

			return {
				sprites: spriteCount,
				mapMs,
				denseMs,
				reductionPercent: ((mapMs - denseMs) / mapMs) * 100,
				byteEquivalent,
			};
		}

		return [measure(10_000), measure(100_000)];
	});

	if (results.some(result => !result.byteEquivalent)) {
		throw new Error('Submission variants produced different instance bytes.');
	}

	console.table(
		results.map(result => ({
			'sprites/frame': result.sprites,
			'map + string (ms)': result.mapMs.toFixed(3),
			'dense metadata (ms)': result.denseMs.toFixed(3),
			'reduction (%)': result.reductionPercent.toFixed(1),
			'byte equivalent': result.byteEquivalent,
		}))
	);
} finally {
	await browser.close();
}
