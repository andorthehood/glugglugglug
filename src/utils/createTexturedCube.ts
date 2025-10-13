import {
	fillBufferWithCubeVertices,
	CUBE_FLOAT_COUNT,
	CUBE_VERTEX_COUNT,
} from "./positionBufferHelpers";
import { VERTICES_PER_QUAD } from "./colorBufferHelpers";
import {
	setQuadUVRect,
	TEX_COORD_COMPONENTS_PER_VERTEX,
} from "./textureBufferHelpers";

const QUADS_PER_CUBE = CUBE_VERTEX_COUNT / VERTICES_PER_QUAD;
const TEX_COORD_COMPONENTS_PER_QUAD = VERTICES_PER_QUAD * TEX_COORD_COMPONENTS_PER_VERTEX;
const FACE_COUNT = QUADS_PER_CUBE;

const FACE_TEX_COORD_TEMPLATES: ReadonlyArray<Float32Array> = [
	new Float32Array([
		0, 0,
		1, 0,
		0, 1,
		0, 1,
		1, 0,
		1, 1,
	]),
	new Float32Array([
		1, 0,
		1, 1,
		0, 0,
		1, 1,
		0, 1,
		0, 0,
	]),
	new Float32Array([
		0, 0,
		1, 0,
		0, 1,
		0, 1,
		1, 0,
		1, 1,
	]),
	new Float32Array([
		1, 0,
		1, 1,
		0, 0,
		1, 1,
		0, 1,
		0, 0,
	]),
	new Float32Array([
		0, 1,
		0, 0,
		1, 1,
		0, 0,
		1, 0,
		1, 1,
	]),
	new Float32Array([
		0, 0,
		1, 0,
		0, 1,
		0, 1,
		1, 0,
		1, 1,
	]),
];

type Vec2 = [number, number];
type Vec3 = [number, number, number];

export interface CreateTexturedCubeParams {
	positions: Float32Array;
	texCoords: Float32Array;
	quadUVRects: Float32Array;
	cubeIndex: number;
	size: number;
	center?: Vec3;
	textureTopLeft: Vec2;
	textureSize: Vec2;
}

export function createTexturedCube({
	positions,
	texCoords,
	quadUVRects,
	cubeIndex,
	size,
	center = [0, 0, 0],
	textureTopLeft,
	textureSize,
}: CreateTexturedCubeParams): void {
	const [uLeft, vTop] = textureTopLeft;
	const [width, height] = textureSize;
	const vMin = 1 - (vTop + height);

	const positionOffset = cubeIndex * CUBE_FLOAT_COUNT;
	fillBufferWithCubeVertices(positions, positionOffset, size, center);

	const texCoordOffset = cubeIndex * QUADS_PER_CUBE * TEX_COORD_COMPONENTS_PER_QUAD;

	for (let face = 0; face < FACE_COUNT; face += 1) {
		const template = FACE_TEX_COORD_TEMPLATES[face];
		const faceOffset = texCoordOffset + face * TEX_COORD_COMPONENTS_PER_QUAD;
		texCoords.set(template, faceOffset);
	}

	const quadBaseIndex = cubeIndex * QUADS_PER_CUBE;
	for (let quad = 0; quad < QUADS_PER_CUBE; quad += 1) {
		setQuadUVRect(quadUVRects, quadBaseIndex + quad, uLeft, vMin, width, height);
	}
}

export { QUADS_PER_CUBE };
