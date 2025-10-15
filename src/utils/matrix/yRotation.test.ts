import { describe, expect, it } from "vitest";
import { yRotation } from "./yRotation";
import { formatMatrix } from "./testUtils";

describe("yRotation", () => {
	it("creates a rotation matrix around the y axis", () => {
		const angle = Math.PI / 4;

		expect(formatMatrix(yRotation(angle))).toMatchSnapshot();
	});

	it("writes into an existing matrix", () => {
		const angle = Math.PI / 4;
		const dst = new Array<number>(16);
		const result = yRotation(angle, dst);

		expect(result).toBe(dst);
		expect(formatMatrix(dst)).toMatchSnapshot();
	});
});
