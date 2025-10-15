import { describe, expect, it } from "vitest";
import { xRotation } from "./xRotation";
import { formatMatrix } from "./testUtils";

describe("xRotation", () => {
	it("creates a rotation matrix around the x axis", () => {
		const angle = Math.PI / 4;

		expect(formatMatrix(xRotation(angle))).toMatchSnapshot();
	});

	it("writes into an existing matrix", () => {
		const angle = Math.PI / 4;
		const dst = new Array<number>(16);
		const result = xRotation(angle, dst);

		expect(result).toBe(dst);
		expect(formatMatrix(dst)).toMatchSnapshot();
	});
});
