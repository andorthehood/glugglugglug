export function translation(tx: number, ty: number, tz: number) {
	return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1];
}
