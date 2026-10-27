import { describe, expect, it } from 'vitest';
import { validateSpriteAtlasGrid } from './spriteAtlas.ts';

const grid = { cellWidth: 5, cellHeight: 8, columns: 16, cellCount: 129 };

describe('uniform atlas grid', () => {
	it('accepts a partially populated last row and all 65536 uint16 cell indices', () => {
		expect(() => validateSpriteAtlasGrid(grid, 80, 72)).not.toThrow();
		expect(() =>
			validateSpriteAtlasGrid({ cellWidth: 1, cellHeight: 1, columns: 256, cellCount: 65536 }, 256, 256)
		).not.toThrow();
	});
	it.each(['cellWidth', 'cellHeight', 'columns', 'cellCount'] as const)('rejects invalid %s', key => {
		for (const value of [0, -1, 1.5, NaN, Infinity]) {
			expect(() => validateSpriteAtlasGrid({ ...grid, [key]: value }, 80, 72)).toThrow('positive integer');
		}
	});
	it('rejects mismatched dimensions, extra rows, and more than 65536 cells', () => {
		for (const [width, height] of [
			[79, 72],
			[80, 71],
			[80, 80],
		]) {
			expect(() => validateSpriteAtlasGrid(grid, width, height)).toThrow('dimensions must match');
		}
		expect(() => validateSpriteAtlasGrid({ ...grid, cellCount: 65537 }, 80, 72)).toThrow('16-bit');
	});
});
