import { Engine, LineDrawer, RgbaTextureLayer } from 'glugglugglug';

/** A shared fill and two distinct asymmetric masks expose incorrect atlas selection or orientation. */
function createAtlas() {
	return {
		width: 9,
		height: 4,
		data: new Uint8Array(
			[
				// Each row contains the fill column, four stairs pixels, and four cutout pixels.
				[255, 255, 0, 0, 0, 255, 255, 255, 0],
				[0, 255, 255, 0, 0, 255, 0, 128, 255],
				[0, 255, 255, 255, 0, 255, 0, 255, 255],
				[0, 255, 255, 255, 255, 0, 0, 255, 255],
			].flat()
		),
	};
}

const canvas = document.querySelector<HTMLCanvasElement>('#output');
if (!canvas) {
	throw new Error('Could not find the visual-test output canvas.');
}

const engine = new Engine(canvas, { initialCapacity: 2 });
engine.setPalette(new Uint8Array([239, 68, 68, 255, 34, 197, 94, 255, 250, 204, 21, 153]));

const textureLayer = new RgbaTextureLayer(engine);
const texture = textureLayer.uploadRgba8Texture(
	new Uint8Array([124, 58, 237, 255, 14, 165, 233, 255, 249, 115, 22, 230, 20, 184, 166, 180]),
	2,
	2
);
const linearTexture = textureLayer.uploadRgba8Texture(
	new Uint8Array([124, 58, 237, 255, 14, 165, 233, 255, 249, 115, 22, 230, 20, 184, 166, 180]),
	2,
	2,
	{ filter: 'linear' }
);
textureLayer.setDrawCallback(layer => {
	layer.drawTexture(texture, 16, 16, 128, 64, 0.85);
	layer.drawTexture(linearTexture, 108, 8, 44, 24, 0.9);
});

const lines = new LineDrawer(engine, { initialCapacity: 1 });
const atlas = engine.setSpriteAtlas(createAtlas(), {
	fill: { x: 0, y: 0, spriteWidth: 1, spriteHeight: 1 },
	stairs: { x: 1, y: 0, spriteWidth: 4, spriteHeight: 4 },
	cutout: { x: 5, y: 0, spriteWidth: 4, spriteHeight: 4 },
});
const fill = atlas.resolveSprite('fill');
const stairs = atlas.resolveSprite('stairs');
const cutout = atlas.resolveSprite('cutout');

// This frame must be completely removed by the next renderFrame call.
engine.renderFrame(() => {
	engine.drawSprite(0, 0, fill, 0, canvas.width, canvas.height);
});

engine.renderFrame(() => {
	engine.drawSprite(4, 4, stairs, 1);
	engine.drawSprite(12, 12, fill, 0, 32, 24);
	engine.drawSprite(56, 8, stairs, 1, 40, 32);
	engine.drawSprite(28, 48, fill, 1, 52, 36);
	engine.drawSprite(52, 60, stairs, 0, 52, 28);
	engine.drawSprite(92, 44, cutout, 2, 40, 40);
	engine.drawSprite(108, 36, cutout, 2, 40, 40);
	lines.drawLine(8, 8, 152, 88, 3, [0.9, 0.95, 1, 1]);
	lines.drawLine(8, 88, 152, 8, 2, [0.15, 0.8, 1, 0.85]);
});

const glError = engine.gl.getError();
if (glError !== engine.gl.NO_ERROR) {
	throw new Error(`Visual regression fixture ended with WebGL error ${glError}.`);
}

document.body.dataset.ready = 'true';
