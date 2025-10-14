import { describe, expect, it } from "vitest";
import { perspective } from "./perspective";
import { formatMatrix } from "./testUtils";

describe("perspective", () => {
	it("builds a perspective projection matrix", () => {
		const fieldOfViewInRadians = Math.PI / 3;
		const aspect = 16 / 9;
		const near = 1;
		const far = 200;

		const result = perspective(fieldOfViewInRadians, aspect, near, far);

		expect(formatMatrix(result)).toMatchSnapshot();
	});
});
