import { VERTICES_PER_QUAD } from "./constants";

/**
 * Fills a buffer segment with the quad index repeated for each vertex.
 * @param buffer Destination Uint8Array storing quad indices per vertex.
 * @param quadIndex The quad index to write.
 * @param offset Starting index within the buffer.
 */
export function fillBufferWithQuadIndices(
	buffer: Uint8Array,
	quadIndex: number,
	offset: number,
): void {
	for (let i = 0; i < VERTICES_PER_QUAD; i += 1) {
		buffer[offset + i] = quadIndex;
	}
}
