import type { SpriteAtlasGrid } from './types.ts';

/** Validates the uniform grid once when installing an atlas, before replacing resources. */
export function validateSpriteAtlasGrid(grid: SpriteAtlasGrid, width: number, height: number): void {
	const { cellWidth, cellHeight, columns, cellCount } = grid;
	for (const [name, value] of Object.entries({ width, height, cellWidth, cellHeight, columns, cellCount })) {
		if (!Number.isSafeInteger(value) || value <= 0) {
			throw new RangeError(`${name} must be a positive integer.`);
		}
	}
	if (grid.cellCount > 0x10000) {
		throw new RangeError('The atlas exceeds the 16-bit sprite ID limit.');
	}
	if (
		width !== grid.columns * grid.cellWidth ||
		height !== Math.ceil(grid.cellCount / grid.columns) * grid.cellHeight
	) {
		throw new RangeError('Atlas dimensions must match its grid, including the partially populated final row.');
	}
}
