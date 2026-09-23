/** Module-local lifecycle check implemented by resource-owning classes. */
export const assertLive = Symbol('assertLive');

type LiveResource = {
	[assertLive](): void;
};

/**
 * Runs a resource's lifecycle check before invoking one of its cold-path methods.
 *
 * Hot-path methods should keep lifecycle validation out of their call path and
 * must not use this decorator.
 */
export function requiresLive<This extends LiveResource, Args extends unknown[], Result>(
	method: (this: This, ...args: Args) => Result,
	_context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>
): (this: This, ...args: Args) => Result {
	return function (this: This, ...args: Args): Result {
		this[assertLive]();
		return method.apply(this, args);
	};
}
