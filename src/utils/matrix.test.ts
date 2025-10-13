import { describe, it, expect } from "vitest";
import {
	perspective,
	projection,
	multiply,
	translation,
	xRotation,
	yRotation,
	zRotation,
	scaling,
	translate,
	xRotate,
	yRotate,
	zRotate,
	scale,
	inverse,
	vectorMultiply,
} from "./matrix";

function roundValue(value: number, precision = 6) {
	const factor = 10 ** precision;
	const rounded = Math.round(value * factor) / factor;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function formatMatrix(values: number[]) {
	return Array.from({ length: 4 }, (_, row) => {
		const start = row * 4;
		return values.slice(start, start + 4).map((value) => roundValue(value));
	});
}

function formatVector(values: number[]) {
	return values.map((value) => roundValue(value));
}

describe("matrix utilities", () => {
	it("builds a perspective projection matrix", () => {
		const fieldOfViewInRadians = Math.PI / 3;
		const aspect = 16 / 9;
		const near = 1;
	const far = 200;
	const result = perspective(fieldOfViewInRadians, aspect, near, far);

	expect(formatMatrix(result)).toMatchSnapshot();
	});

	it("builds an orthographic projection matrix with the current implementation", () => {
	const result = projection(4, 2, 8);

	expect(formatMatrix(result)).toMatchSnapshot();
	});

	it("multiplies two matrices in column-major order", () => {
		const a = translation(1, 2, 3);
	const b = scaling(2, 3, 4);

	expect(formatMatrix(multiply(a, b))).toMatchSnapshot();

	expect(formatMatrix(multiply(b, a))).toMatchSnapshot();
	});

	it("translates a matrix via the helper", () => {
		const base = scaling(1, 2, 3);

	expect(formatMatrix(translate(base, 4, 5, 6))).toMatchSnapshot();
	});

	it("creates rotation matrices around each axis", () => {
		const angle = Math.PI / 4;

	expect(formatMatrix(xRotation(angle))).toMatchSnapshot();
	expect(formatMatrix(yRotation(angle))).toMatchSnapshot();
	expect(formatMatrix(zRotation(angle))).toMatchSnapshot();
	});

	it("composes transforms via helpers", () => {
		const base = translation(5, -3, 2);
		const composed = scale(
			zRotate(
				yRotate(
					xRotate(base, Math.PI / 6),
					Math.PI / 4,
				),
				Math.PI / 3,
			),
			2,
			2,
			2,
		);

	expect(formatMatrix(composed)).toMatchSnapshot();
	});

	it("inverts affine matrices", () => {
		const matrix = multiply(
			translation(4, -2, 7),
			multiply(
				yRotation(Math.PI / 6),
				scaling(2, 0.5, 3),
			),
		);
		const inv = inverse(matrix);
		const identity = multiply(matrix, inv);

	expect(formatMatrix(matrix)).toMatchSnapshot();
	expect(formatMatrix(inv)).toMatchSnapshot();
	expect(formatMatrix(identity)).toMatchSnapshot();
	});

	it("multiplies a vector by a matrix", () => {
		const vec = [1, 2, 3, 1];
		const mat = translation(4, -5, 6);

	expect(formatVector(vectorMultiply(vec, mat))).toMatchSnapshot();
});
});
