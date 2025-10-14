import { describe, expect, it } from "vitest";
import { scale } from "./scale";
import { translation } from "./translation";
import { xRotate } from "./xRotate";
import { yRotate } from "./yRotate";
import { zRotate } from "./zRotate";
import { formatMatrix } from "./testUtils";

describe("scale", () => {
	it("composes transforms via helpers", () => {
		const base = translation(5, -3, 2);
		const composed = scale(
			zRotate(
				yRotate(xRotate(base, Math.PI / 6), Math.PI / 4),
				Math.PI / 3,
			),
			2,
			2,
			2,
		);

		expect(formatMatrix(composed)).toMatchSnapshot();
	});
});
