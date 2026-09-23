import { describe, expect, it } from 'vitest';

import { assertLive, requiresLive } from './lifecycle.ts';

describe('requiresLive', () => {
	it('checks lifecycle state before preserving the method call', () => {
		class Resource {
			destroyed = false;
			calls = 0;

			[assertLive](): void {
				if (this.destroyed) {
					throw new Error('Resource has been destroyed.');
				}
			}

			@requiresLive
			increment(amount: number): number {
				this.calls += amount;
				return this.calls;
			}
		}

		const resource = new Resource();
		expect(resource.increment(2)).toBe(2);

		resource.destroyed = true;
		expect(() => resource.increment(3)).toThrow('Resource has been destroyed.');
		expect(resource.calls).toBe(2);
	});
});
