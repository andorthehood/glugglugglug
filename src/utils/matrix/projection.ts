export function projection(width: number, height: number, depth: number) {
	return [
		2 / width,
		0,
		0,
		0,
		0,
		-2 / height,
		0,
		0,
		0,
		0,
		2 / depth,
		0,
		-1,
		1,
		0,
		1,
	];
}
