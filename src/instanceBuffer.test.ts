import { describe, expect, it } from 'vitest';

import { INSTANCE_BYTE_STRIDE, InstanceBuffer } from './instanceBuffer.ts';

describe('InstanceBuffer', () => {
	it('packs rectangles and sprite ids into 20-byte records', () => {
		const instances = new InstanceBuffer(2);
		instances.append(10, 20, 30, 40, 7, 65535);
		instances.append(-5, 2.5, 12, 14, 65535, 9);

		const bytes = instances.fullBytes;
		const floats = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
		const integers = new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);

		expect(instances.count).toBe(2);
		expect(instances.usedByteLength).toBe(2 * INSTANCE_BYTE_STRIDE);
		expect(bytes.byteLength).toBe(2 * INSTANCE_BYTE_STRIDE);
		expect(Array.from(floats.slice(0, 4))).toEqual([10, 20, 30, 40]);
		expect(Array.from(integers.slice(8, 10))).toEqual([7, 65535]);
		expect(Array.from(floats.slice(5, 9))).toEqual([-5, 2.5, 12, 14]);
		expect(Array.from(integers.slice(18, 20))).toEqual([65535, 9]);
	});

	it('grows geometrically while preserving instances already appended this frame', () => {
		const instances = new InstanceBuffer(1);
		instances.append(1, 2, 3, 4, 5, 0);
		const originalView = instances.fullBytes;
		instances.append(6, 7, 8, 9, 10, 0);

		expect(instances.capacity).toBe(2);
		expect(instances.fullBytes).not.toBe(originalView);
		expect(instances.fullBytes.byteLength).toBe(2 * INSTANCE_BYTE_STRIDE);
		const floats = new Float32Array(instances.fullBytes.buffer);
		expect(Array.from(floats.slice(0, 4))).toEqual([1, 2, 3, 4]);
		expect(Array.from(floats.slice(5, 9))).toEqual([6, 7, 8, 9]);
	});

	it('resets only the write cursor and reuses the allocation', () => {
		const instances = new InstanceBuffer(2);
		instances.append(1, 2, 3, 4, 5, 0);
		const bytes = instances.fullBytes;

		instances.reset();
		expect(instances.usedByteLength).toBe(0);
		expect(instances.fullBytes).toBe(bytes);
		instances.append(10, 20, 30, 40, 50, 0);

		expect(instances.count).toBe(1);
		expect(instances.usedByteLength).toBe(INSTANCE_BYTE_STRIDE);
		expect(instances.fullBytes).toBe(bytes);
		expect(bytes.byteLength).toBe(2 * INSTANCE_BYTE_STRIDE);
		const floats = new Float32Array(bytes.buffer);
		expect(Array.from(floats.slice(0, 4))).toEqual([10, 20, 30, 40]);
	});

	it('rejects invalid initial capacities', () => {
		expect(() => new InstanceBuffer(0)).toThrow('initialCapacity must be a positive integer');
		expect(() => new InstanceBuffer(1.5)).toThrow('initialCapacity must be a positive integer');
	});
});
