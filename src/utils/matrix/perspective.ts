export function perspective(
	fieldOfViewInRadians: number,
	aspect: number,
	near: number,
	far: number,
) {
	const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
	const rangeInv = 1.0 / (near - far);

	return [
		f / aspect,
		0,
		0,
		0,
		0,
		f,
		0,
		0,
		0,
		0,
		(near + far) * rangeInv,
		-1,
		0,
		0,
		near * far * rangeInv * 2,
		0,
	];
}
