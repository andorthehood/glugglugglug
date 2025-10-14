export function yRotation(angleInRadians: number) {
	const c = Math.cos(angleInRadians);
	const s = Math.sin(angleInRadians);

	return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}
