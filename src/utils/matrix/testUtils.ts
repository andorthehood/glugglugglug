export function roundValue(value: number, precision = 6) {
	const factor = 10 ** precision;
	const rounded = Math.round(value * factor) / factor;
	return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatMatrix(values: number[]) {
	return Array.from({ length: 4 }, (_, row) => {
		const start = row * 4;
		return values.slice(start, start + 4).map((value) => roundValue(value));
	});
}

export function formatVector(values: number[]) {
	return values.map((value) => roundValue(value));
}
