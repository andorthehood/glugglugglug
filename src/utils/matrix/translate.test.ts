import { describe, expect, it } from "vitest";
import { translate } from "./translate";
import { scaling } from "./scaling";
import { formatMatrix } from "./testUtils";

describe("translate", () => {
	it("translates a matrix via the helper", () => {
		const base = scaling(1, 2, 3);

		expect(formatMatrix(translate(base, 4, 5, 6))).toMatchSnapshot();
	});
});
