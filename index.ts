/**
 * Extracts the item type from an array type.
 * If T is not an array, it resolves to never.
 * @typeParam T The type to extract the item type from.
 */
type ItemType<T> = T extends Array<infer U> ? U : never;

/**
 * A class that wraps an async generator and provides various utility methods for processing the stream of data.
 * @typeParam T The type of items in the async generator.
 */
export default class AsyncStream<T = unknown>
    implements AsyncIterableIterator<T>
{
    /**
     * The underlying async iterable iterator.
     */
    #iter: AsyncIterableIterator<T>;

    /**
     * Creates an instance of AsyncStream.
     * @param iter The async iterable iterator to wrap.
     */
    public constructor(iter: AsyncIterableIterator<T>) {
        this.#iter = iter;
    }

    /**
     * Returns the default async iterator for the object.
     * @returns The async iterable iterator itself.
     * @see {@link Symbol.asyncIterator}
     */
    public [Symbol.asyncIterator](): AsyncIterableIterator<T> {
        return this;
    }

    /**
     * Advances the iterator and returns the next result.
     * @param value An optional value to send to the iterator.
     * @returns A promise that resolves to the next iterator result.
     */
    public next(...[value]: [] | [any]): Promise<IteratorResult<T, any>> {
        return this.#iter.next(value);
    }

    /**
     * Terminates the iterator and returns a result indicating completion.
     * @remarks If the underlying iterator does not have a `return` method, this method will return a resolved promise with `{ done: true, value: undefined }`.
     * @param value An optional value to send to the iterator upon termination.
     * @returns A promise that resolves to the final iterator result.
     */
    public return(value?: any): Promise<IteratorResult<T, any>> {
        return this.#iter.return
            ? this.#iter.return(value)
            : Promise.resolve({ done: true, value: undefined as any });
    }

    /**
     * Throws an error into the iterator.
     * @remarks If the underlying iterator does not have a `throw` method, this method will return a rejected promise with the provided error.
     * @param e An optional error to throw into the iterator.
     * @returns A promise that resolves to the iterator result after the error is thrown.
     */
    public throw(e?: any): Promise<IteratorResult<T, any>> {
        return this.#iter.throw ? this.#iter.throw(e) : Promise.reject(e);
    }

    /**
     * Groups items from an async generator into arrays of a specified size.
     * For example:
     * - Input: [1, 2, 3, 4, 5], packageSize: 2
     * - Output: [[1, 2], [3, 4], [5]]
     * @param packageSize The size of each package.
     * @returns A new instance of AsyncStream containing arrays of items as its underlying generator.
     */
    public pack(packageSize: number): AsyncStream<T[]> {
        const self = this;

        if (packageSize <= 0) {
            throw new RangeError('packageSize must be a positive integer.');
        }

        async function* generator() {
            let buffer: T[] = [];

            for await (const item of self) {
                buffer.push(item);

                if (buffer.length === packageSize) {
                    yield buffer;
                    buffer = [];
                }
            }

            if (buffer.length > 0) {
                yield buffer;
            }
        }

        return new AsyncStream(generator());
    }

    /**
     * Repackages items from an async generator of arrays into new arrays of a specified size.
     * For example:
     * - Input: [[1, 2], [3, 4], [5]], packageSize: 3
     * - Output: [[1, 2, 3], [4, 5]]
     *
     * @remarks This method only works if the input async generator yields arrays. If the input
     * generator yields non-array items, a TypeError will be thrown.
     * @param packageSize The size of each new package.
     * @returns A new instance of AsyncStream containing arrays of items as its underlying generator.
     */
    public repack(packageSize: number): AsyncStream<ItemType<T>[]> {
        const self = this;

        if (packageSize <= 0) {
            throw new RangeError('packageSize must be a positive integer.');
        }

        async function* generator() {
            let buffer: ItemType<T>[] = [];

            for await (const page of self as AsyncIterableIterator<
                ItemType<T>[]
            >) {
                if (!Array.isArray(page)) {
                    throw new TypeError(
                        'Input async generator must yield arrays for repack.'
                    );
                }
                buffer.push(...page);

                while (buffer.length >= packageSize) {
                    yield buffer.slice(0, packageSize);
                    buffer = buffer.slice(packageSize);
                }
            }

            if (buffer.length > 0) {
                yield buffer;
            }
        }

        return new AsyncStream(generator());
    }

    /**
     * Flattens an async generator of arrays into a single async generator of items.
     * @remarks This method only works if the input async generator yields arrays. If the input
     * generator yields non-array items, a TypeError will be thrown.
     * @returns A new instance of AsyncStream containing individual items as its underlying generator.
     */
    public flat(): AsyncStream<ItemType<T>> {
        const self = this;

        async function* generator() {
            for await (const page of self as AsyncIterableIterator<
                ItemType<T>[]
            >) {
                if (!Array.isArray(page)) {
                    throw new TypeError(
                        'Input async generator must yield arrays for flattening.'
                    );
                }

                for (const item of page) {
                    yield item;
                }
            }
        }

        return new AsyncStream(generator());
    }

    /**
     * Transforms each item from an async generator using a provided predicate function.
     * @param predicate A function that takes an item and returns a transformed item or a promise of a transformed item.
     * @typeParam U The type of the transformed items.
     * @returns A new instance of AsyncStream containing transformed items as its underlying generator.
     */
    public map<U>(
        predicate: (item: T, index: number) => U | Promise<U>
    ): AsyncStream<U> {
        const self = this;

        async function* generator() {
            let index = 0;
            for await (const item of self) {
                yield await predicate(item, index);
                index++;
            }
        }

        return new AsyncStream(generator());
    }

    /**
     * Filters items from an async generator based on a provided predicate function.
     * @param predicate A function that takes an item and returns a boolean or a promise of a boolean indicating whether the item should be included.
     * @returns A new instance of AsyncStream containing only the items that satisfy the predicate.
     */
    public filter(
        predicate: (item: T, index: number) => boolean | Promise<boolean>
    ): AsyncStream<T> {
        const self = this;

        async function* generator() {
            let index = 0;
            for await (const item of self) {
                if (await predicate(item, index)) {
                    yield item;
                }
                index++;
            }
        }

        return new AsyncStream(generator());
    }

    /**
     * Reduces an async generator to a single value using a provided reducer function and an initial value.
     * @param reducer A function that takes an accumulator and an item, and returns a new accumulator or a promise of a new accumulator.
     * @param initialValue The initial value for the accumulator.
     * @typeParam U The type of the accumulated value.
     * @returns A promise that resolves to the final accumulated value.
     */
    public async reduce<U>(
        reducer: (accumulator: U, item: T, index: number) => U | Promise<U>,
        initialValue: U
    ): Promise<U> {
        let accumulator = initialValue;
        let index = 0;

        for await (const item of this) {
            accumulator = await reducer(accumulator, item, index);
            index++;
        }

        return accumulator;
    }

    /**
     * Executes a provided action for each item in an async generator.
     * @param action A function that takes an item and performs an action, returning void or a promise of void.
     * @returns A promise that resolves when all items have been processed.
     */
    public async forEach(
        action: (item: T, index: number) => void | Promise<void>
    ): Promise<void> {
        let index = 0;

        for await (const item of this) {
            await action(item, index);
            index++;
        }
    }

    /**
     * Collects all items from an async generator into a single array.
     * @returns A promise that resolves to a single array containing all items.
     */
    public async collect(): Promise<T[]> {
        const results: T[] = [];

        for await (const item of this) {
            results.push(item);
        }

        return results;
    }

    /**
     * Consumes an async generator without retaining any of its items.
     * @returns A promise that resolves when the iterable has been fully consumed.
     */
    public async drain(): Promise<void> {
        for await (const _ of this);
    }

    /**
     * Skips the first N items from an async generator.
     * @param n The number of items to skip.
     * @returns A new instance of AsyncStream containing the remaining items after skipping.
     */
    public skip(n: number): AsyncStream<T> {
        const self = this;

        if (n < 0) {
            throw new RangeError('n must be a non-negative integer.');
        }

        async function* generator() {
            let count = 0;

            if (n > 0) {
                while (count < n) {
                    const { done } = await self.next();
                    if (done) {
                        return;
                    }
                    count++;
                }
            }

            for await (const item of self) {
                yield item;
            }
        }

        return new AsyncStream(generator());
    }

    /**
     * Retrieves the first item from an async generator, or undefined if the iterable is empty.
     * @returns A promise that resolves to the first item or undefined.
     */
    public async first(): Promise<T | undefined> {
        return (await this.next()).value;
    }

    /**
     * Retrieves the last item from an async generator, or undefined if the iterable is empty.
     *
     * **Important:** This function will consume the entire iterable.
     * @returns A promise that resolves to the last item or undefined.
     */
    public async last(): Promise<T | undefined> {
        let lastItem: T | undefined = undefined;
        for await (const item of this) {
            lastItem = item;
        }
        return lastItem;
    }

    /**
     * Retrieves up to the first N items from an async generator.
     * @param n The maximum number of items to retrieve.
     * @returns A new instance of AsyncStream containing the first N items as its underlying generator.
     */
    public take(n: number): AsyncStream<T> {
        const self = this;

        if (n < 0) {
            throw new RangeError('n must be a non-negative integer.');
        }

        if (n === 0) return self;

        async function* generator() {
            for (let count = 0; count < n; count++) {
                const { value, done } = await self.next();
                if (done) {
                    break;
                }
                yield value;
            }
        }

        return new AsyncStream(generator());
    }

    /**
     * Retrieves up to the last N items from an async generator.
     *
     * **Important:** This function will consume the entire iterable and store up to N items in memory.
     * @param n The maximum number of items to retrieve.
     * @returns A new instance of AsyncStream containing the last N items as its underlying generator.
     */
    public takeLast(n: number): AsyncStream<T> {
        const self = this;

        if (n <= 0) {
            throw new RangeError('n must be a positive integer.');
        }

        async function* generator() {
            const results: T[] = [];
            for await (const item of self) {
                results.push(item);
                if (results.length > n) {
                    results.shift();
                }
            }

            for (const item of results) {
                yield item;
            }
        }

        return new AsyncStream(generator());
    }

    /**
     * Counts the number of items in an async generator.
     *
     * **Important:** This function will consume the entire iterable.
     * @returns A promise that resolves to the count of items.
     */
    public async count(): Promise<number> {
        let count = 0;
        for await (const _ of this) {
            count++;
        }
        return count;
    }
}
