import { describe, expect, it } from 'vitest';

import { normalizeSpriteIdentifier, prepareSpriteAtlas } from './spriteAtlas.ts';

describe('prepareSpriteAtlas', () => {
	it('assigns dense ids and encodes source rectangles', () => {
		const prepared = prepareSpriteAtlas(
			{
				player: { x: 1, y: 2, spriteWidth: 8, spriteHeight: 16 },
				enemy: { x: 20, y: 4, spriteWidth: 12, spriteHeight: 10 },
			},
			64,
			64
		);

		expect(Array.from(prepared.metadata)).toEqual([1, 2, 8, 16, 20, 4, 12, 10]);
		expect(prepared.spriteCount).toBe(2);
		expect(prepared.resolver.resolveSprite('player')).toBe(0);
		expect(prepared.resolver.resolveSprite('enemy')).toBe(1);
	});

	it('normalizes public numeric and string ids to the same lookup key', () => {
		expect(normalizeSpriteIdentifier(42)).toBe('42');
		expect(normalizeSpriteIdentifier('42')).toBe('42');
		const prepared = prepareSpriteAtlas(
			{
				42: { x: 0, y: 0, spriteWidth: 1, spriteHeight: 1 },
				player: { x: 1, y: 0, spriteWidth: 1, spriteHeight: 1 },
			},
			2,
			1
		);
		expect(prepared.resolver.resolveSprite(42)).toBe(0);
		expect(prepared.resolver.resolveSprite('42')).toBe(0);
		expect(prepared.resolver.resolveSprite('player')).toBe(1);
		expect(() => prepared.resolver.resolveSprite('missing')).toThrow('Unknown sprite identifier "missing"');
	});

	it('rejects empty, invalid, or out-of-bounds lookup entries', () => {
		expect(() => prepareSpriteAtlas({}, 16, 16)).toThrow('at least one sprite');
		expect(() => prepareSpriteAtlas({ bad: { x: 0.5, y: 0, spriteWidth: 1, spriteHeight: 1 } }, 16, 16)).toThrow(
			'expected a uint16 value'
		);
		expect(() => prepareSpriteAtlas({ bad: { x: 15, y: 0, spriteWidth: 2, spriteHeight: 1 } }, 16, 16)).toThrow(
			'extends outside the atlas'
		);
	});
});
