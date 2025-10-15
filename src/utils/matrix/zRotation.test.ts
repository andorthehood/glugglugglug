import { describe, expect, it } from "vitest";
import { zRotation } from "./zRotation";
import { formatMatrix } from "./testUtils";

describe("zRotation", () => {
	it("creates a rotation matrix around the z axis", () => {
		const angle = Math.PI / 4;

		expect(formatMatrix(zRotation(angle))).toMatchSnapshot();
	});

	it("writes into an existing matrix", () => {
		const angle = Math.PI / 4;
		const dst = new Array<number>(16);
		const result = zRotation(angle, dst);

		expect(result).toBe(dst);
		expect(formatMatrix(dst)).toMatchSnapshot();
	});
});
