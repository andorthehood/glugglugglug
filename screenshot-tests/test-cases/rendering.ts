import { Engine, LineDrawer, RgbaTextureLayer } from 'glugglugglug';

/** Coverage-only tiles. Color accents are composed from shared masks at runtime. */
function createAtlas() {
	const data = new Uint8Array(12 * 4).fill(255);
	for (let y = 1; y < 3; y++) for (let x = 9; x < 11; x++) data[y * 12 + x] = 0;
	return { width: 12, height: 4, data };
}

const canvas = document.querySelector<HTMLCanvasElement>('#output');
if (!canvas) {
	throw new Error('Could not find the visual-test output canvas.');
}

const engine = new Engine(canvas, { initialCapacity: 2 });
engine.setPalette(
	new Uint8Array([239, 68, 68, 255, 127, 29, 29, 255, 34, 197, 94, 255, 20, 83, 45, 255, 250, 204, 21, 153])
);

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
	red: { x: 0, y: 0, spriteWidth: 4, spriteHeight: 4 },
	green: { x: 4, y: 0, spriteWidth: 4, spriteHeight: 4 },
	7: { x: 8, y: 0, spriteWidth: 4, spriteHeight: 4 },
});
const red = atlas.resolveSprite('red');
const green = atlas.resolveSprite('green');
const yellow = atlas.resolveSprite(7);

// This frame must be completely removed by the next renderFrame call.
engine.renderFrame(() => {
	engine.drawSprite(0, 0, red, 0, canvas.width, canvas.height);
});

function redTile(x: number, y: number, width = 4, height = 4) {
	engine.drawSprite(x, y, red, 0, width, height);
	engine.drawSprite(x, y, red, 1, width / 4, height / 4);
	engine.drawSprite(x + (width * 3) / 4, y + (height * 3) / 4, red, 1, width / 4, height / 4);
}
function greenTile(x: number, y: number, width = 4, height = 4) {
	engine.drawSprite(x, y, green, 2, width, height);
	engine.drawSprite(x + width / 4, y + height / 4, green, 3, width / 2, height / 2);
}
engine.renderFrame(() => {
	greenTile(4, 4);
	redTile(12, 12, 32, 24);
	greenTile(56, 8, 40, 32);
	redTile(28, 48, 52, 36);
	greenTile(52, 60, 52, 28);
	engine.drawSprite(92, 44, yellow, 4, 40, 40);
	engine.drawSprite(108, 36, yellow, 4, 40, 40);
	lines.drawLine(8, 8, 152, 88, 3, [0.9, 0.95, 1, 1]);
	lines.drawLine(8, 88, 152, 8, 2, [0.15, 0.8, 1, 0.85]);
});

const glError = engine.gl.getError();
if (glError !== engine.gl.NO_ERROR) {
	throw new Error(`Visual regression fixture ended with WebGL error ${glError}.`);
}

document.body.dataset.ready = 'true';
