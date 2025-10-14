import { describe, expect, it } from "vitest";
import { projection } from "./projection";
import { formatMatrix } from "./testUtils";

describe("projection", () => {
	it("builds an orthographic projection matrix with the current implementation", () => {
		const result = projection(4, 2, 8);

		expect(formatMatrix(result)).toMatchSnapshot();
	});
});
