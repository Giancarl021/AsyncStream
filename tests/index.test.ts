import { describe, test, expect, jest } from '@jest/globals';

import AsyncStream from '../index.js';

function getGenerator<T>(returns: T[]) {
    return async function* () {
        for (const item of returns) {
            yield item;
        }
    };
}

describe('AsyncStream', () => {
    test('Should return the same properties as the original stream', async () => {
        const generator = getGenerator([1, 2, 3]);
        const stream = new AsyncStream(generator());

        expect(stream[Symbol.asyncIterator]).toBeDefined();
        expect(stream[Symbol.asyncIterator]()).toBe(stream);

        expect(stream).toMatchObject({
            pack: expect.any(Function),
            repack: expect.any(Function),
            flat: expect.any(Function),
            collect: expect.any(Function),
            drain: expect.any(Function),
            skip: expect.any(Function),
            map: expect.any(Function),
            filter: expect.any(Function),
            reduce: expect.any(Function),
            first: expect.any(Function),
            last: expect.any(Function),
            take: expect.any(Function),
            takeLast: expect.any(Function),
            count: expect.any(Function)
        });
    });

    test('Should create an empty AsyncStream', async () => {
        const stream = AsyncStream.empty<number>();

        await expect(stream.collect()).resolves.toEqual([]);
        await expect(stream.count()).resolves.toBe(0);
        await expect(stream.first()).resolves.toBeUndefined();
        await expect(stream.last()).resolves.toBeUndefined();
        await expect(stream.take(5).collect()).resolves.toEqual([]);
        await expect(stream.takeLast(5).collect()).resolves.toEqual([]);
        await expect(stream.drain()).resolves.toBeUndefined();
        await expect(stream[Symbol.asyncIterator]().next()).resolves.toEqual({
            value: undefined,
            done: true
        });
    });

    test('Should create an AsyncStream from an array', async () => {
        const stream1 = AsyncStream.from([1, 2, 3]);
        await expect(stream1.collect()).resolves.toEqual([1, 2, 3]);

        const stream2 = AsyncStream.from<string>([]);
        await expect(stream2.collect()).resolves.toEqual([]);
    });

    test('Should work as a original async generator', async () => {
        const generator1 = getGenerator([1, 2, 3]);
        const stream1 = new AsyncStream(generator1());

        const data: number[] = [];

        for await (const item of stream1) {
            data.push(item);
        }

        expect(data).toEqual([1, 2, 3]);

        async function* generator2() {
            yield 1;
            throw new Error('Test error');
        }

        const stream2 = new AsyncStream(generator2());
        await expect(stream2.collect()).rejects.toThrow('Test error');

        let error: any;
        async function* generator3() {
            try {
                yield 1;
                yield 2;
            } catch (err) {
                error = err;
                yield -1;
            }
            yield 3;
        }

        const stream3 = new AsyncStream(generator3());

        await expect(stream3.next()).resolves.toEqual({
            value: 1,
            done: false
        });
        await expect(stream3.next()).resolves.toEqual({
            value: 2,
            done: false
        });
        await expect(stream3.throw(new Error('Test error'))).resolves.toEqual({
            value: -1,
            done: false
        });
        expect(error).toBeDefined();
        expect(error.message).toBe('Test error');
        await expect(stream3.next()).resolves.toEqual({
            value: 3,
            done: false
        });
        await expect(stream3.next()).resolves.toEqual({
            value: undefined,
            done: true
        });

        async function* generator4() {
            try {
                yield 1;
                yield 2;
                yield 3;
            } finally {
                yield -1;
            }
            yield 4;
        }

        const stream4 = new AsyncStream(generator4());

        await expect(stream4.next()).resolves.toEqual({
            value: 1,
            done: false
        });
        await expect(stream4.next()).resolves.toEqual({
            value: 2,
            done: false
        });
        await expect(stream4.return()).resolves.toEqual({
            value: -1,
            done: false
        });
        await expect(stream4.next()).resolves.toEqual({
            value: undefined,
            done: true
        });

        const generator5 = {
            async next() {
                return { value: 1, done: false };
            }
        };

        const stream5 = new AsyncStream(generator5 as any);
        await expect(stream5.next()).resolves.toEqual({
            value: 1,
            done: false
        });
        await expect(stream5.return()).resolves.toEqual({
            value: undefined,
            done: true
        });
        await expect(stream5.throw('erro')).rejects.toBe('erro');
    });

    test('Practical example (Natural numbers)', async () => {
        async function* naturalNumbers() {
            let n = 1;
            while (true) {
                yield n++;
            }
        }

        const stream = new AsyncStream(naturalNumbers());

        const result = await stream
            .filter(n => n % 2 === 0) // Keep only even numbers
            .map(n => n * n) // Square the numbers
            .pack(2) // Group into pairs
            .take(5) // Take the first 5 pairs
            .collect(); // Collect the results into an array

        expect(result).toEqual([
            [4, 16],
            [36, 64],
            [100, 144],
            [196, 256],
            [324, 400]
        ]);
    });

    test('pack function', async () => {
        const generator1 = getGenerator([1, 2, 3, 4]);
        const stream1 = new AsyncStream(generator1()).pack(2);
        await expect(stream1.collect()).resolves.toEqual([
            [1, 2],
            [3, 4]
        ]);

        const generator2 = getGenerator([1, 2, 3, 4, 5]);
        const stream2 = new AsyncStream(generator2()).pack(2);

        await expect(stream2.collect()).resolves.toEqual([[1, 2], [3, 4], [5]]);

        const generator3 = getGenerator([1, 2, 3]);
        const stream3 = new AsyncStream(generator3());

        expect(() => stream3.pack(0)).toThrow(
            'packageSize must be a positive integer.'
        );
    });

    test('repack function', async () => {
        const generator1 = getGenerator([[1, 2], [3, 4], [5]]);
        const stream1 = new AsyncStream(generator1());

        await expect(stream1.repack(3).collect()).resolves.toEqual([
            [1, 2, 3],
            [4, 5]
        ]);

        const generator2 = getGenerator([1, 2, 3, 4, 5]);
        const stream2 = new AsyncStream(generator2());

        await expect(stream2.repack(2).collect()).rejects.toThrow(
            'Input async generator must yield arrays for repack.'
        );

        const generator3 = getGenerator([
            [1, 2],
            [3, 4],
            [5, 6]
        ]);
        const stream3 = new AsyncStream(generator3());

        await expect(stream3.repack(2).collect()).resolves.toEqual([
            [1, 2],
            [3, 4],
            [5, 6]
        ]);

        const generator4 = getGenerator([
            [1, 2],
            [3, 4],
            [5, 6]
        ]);
        const stream4 = new AsyncStream(generator4());

        expect(() => stream4.repack(0)).toThrow(
            'packageSize must be a positive integer.'
        );
    });

    test('flat function', async () => {
        const generator1 = getGenerator([[1, 2], [3, 4], [5]]);
        const stream1 = new AsyncStream(generator1());

        await expect(stream1.flat().collect()).resolves.toEqual([
            1, 2, 3, 4, 5
        ]);

        const generator2 = getGenerator([1, 2, 3, 4, 5]);
        const stream2 = new AsyncStream(generator2());

        await expect(stream2.flat().collect()).rejects.toThrow(
            'Input async generator must yield arrays for flattening.'
        );
    });

    test('map function', async () => {
        const generator1 = getGenerator([1, 2, 3]);
        const stream1 = new AsyncStream(generator1()).map(x => x * 2);

        await expect(stream1.collect()).resolves.toEqual([2, 4, 6]);

        const generator2 = getGenerator([1, 2, 3]);
        const stream2 = new AsyncStream(generator2()).map(async x => x * 2);

        await expect(stream2.collect()).resolves.toEqual([2, 4, 6]);

        const generator3 = getGenerator([1, 2, 3]);
        const stream3 = new AsyncStream(generator3()).map(async (x, i) => {
            return Promise.resolve(x * 2 + i);
        });
        await expect(stream3.collect()).resolves.toEqual([2, 5, 8]);
    });

    test('filter function', async () => {
        const generator1 = getGenerator([1, 2, 3, 4, 5]);
        const stream1 = new AsyncStream(generator1()).filter(x => x % 2 === 0);

        await expect(stream1.collect()).resolves.toEqual([2, 4]);

        const generator2 = getGenerator([1, 2, 3, 4, 5]);
        const stream2 = new AsyncStream(generator2()).filter(
            async x => x % 2 === 0
        );

        await expect(stream2.collect()).resolves.toEqual([2, 4]);

        const generator3 = getGenerator([1, 2, 3, 4, 5]);
        const stream3 = new AsyncStream(generator3()).filter(async (_, i) => {
            return Promise.resolve(i % 2 === 0);
        });
        await expect(stream3.collect()).resolves.toEqual([1, 3, 5]);
    });

    test('reduce function', async () => {
        const generator1 = getGenerator([1, 2, 3, 4]);
        const stream1 = new AsyncStream(generator1());
        await expect(stream1.reduce((acc, val) => acc + val, 0)).resolves.toBe(
            10
        );

        const generator2 = getGenerator([1, 2, 3, 4]);
        const stream2 = new AsyncStream(generator2());
        await expect(
            stream2.reduce(async (acc, val) => acc + val, 0)
        ).resolves.toBe(10);

        const generator3 = getGenerator([1, 2, 3, 4]);
        const stream3 = new AsyncStream(generator3());
        await expect(
            stream3.reduce(async (acc, val, i) => acc + val + i, 0)
        ).resolves.toBe(16);
    });

    test('forEach function', async () => {
        const generator = getGenerator([1, 2, 3]);
        const stream = new AsyncStream(generator());
        const mockFn = jest.fn();

        await expect(stream.forEach(mockFn as any)).resolves.toBeUndefined();
        expect(mockFn).toHaveBeenCalledTimes(3);
        expect(mockFn).toHaveBeenNthCalledWith(1, 1, 0);
        expect(mockFn).toHaveBeenNthCalledWith(2, 2, 1);
        expect(mockFn).toHaveBeenNthCalledWith(3, 3, 2);
    });

    test('collect function', async () => {
        const generator = getGenerator([1, 2, 3]);
        const stream = new AsyncStream(generator());

        await expect(stream.collect()).resolves.toEqual([1, 2, 3]);
    });

    test('drain function', async () => {
        const generator = getGenerator([1, 2, 3]);
        const stream = new AsyncStream(generator());

        await expect(stream.drain()).resolves.toBeUndefined();

        await expect(stream.collect()).resolves.toEqual([]);

        await expect(stream.drain()).resolves.toBeUndefined();

        await expect(stream[Symbol.asyncIterator]().next()).resolves.toEqual({
            value: undefined,
            done: true
        });
    });

    test('skip function', async () => {
        const generator1 = getGenerator([1, 2, 3, 4, 5]);
        const stream1 = new AsyncStream(generator1());

        await expect(stream1.skip(2).collect()).resolves.toEqual([3, 4, 5]);

        const generator2 = getGenerator([1, 2, 3, 4, 5]);
        const stream2 = new AsyncStream(generator2());

        await expect(stream2.skip(10).collect()).resolves.toEqual([]);

        const generator3 = getGenerator([1, 2, 3, 4, 5]);
        const stream3 = new AsyncStream(generator3());

        await expect(stream3.skip(0).collect()).resolves.toEqual([
            1, 2, 3, 4, 5
        ]);

        const generator4 = getGenerator([1, 2, 3, 4, 5]);
        const stream4 = new AsyncStream(generator4());

        expect(() => stream4.skip(-1)).toThrow(
            'n must be a non-negative integer.'
        );

        await expect(stream4.skip(1).skip(2).collect()).resolves.toEqual([
            4, 5
        ]);
    });

    test('first function', async () => {
        const generator1 = getGenerator([1, 2, 3]);
        const stream1 = new AsyncStream(generator1());
        await expect(stream1.first()).resolves.toBe(1);
        await expect(stream1.first()).resolves.toBe(2);
        await expect(stream1.collect()).resolves.toEqual([3]);

        const generator2 = getGenerator<number>([]);
        const stream2 = new AsyncStream(generator2());
        await expect(stream2.first()).resolves.toBeUndefined();
    });

    test('last function', async () => {
        const generator1 = getGenerator([1, 2, 3]);
        const stream1 = new AsyncStream(generator1());
        await expect(stream1.last()).resolves.toBe(3);
        await expect(stream1.last()).resolves.toBeUndefined();
        await expect(stream1.collect()).resolves.toEqual([]);

        const generator2 = getGenerator<number>([]);
        const stream2 = new AsyncStream(generator2());
        await expect(stream2.last()).resolves.toBeUndefined();
        await expect(stream2.collect()).resolves.toEqual([]);
    });

    test('take function', async () => {
        const generator = getGenerator([1, 2, 3, 4, 5]);
        const stream = new AsyncStream(generator());

        await expect(stream.take(3).collect()).resolves.toEqual([1, 2, 3]);
        await expect(stream.collect()).resolves.toEqual([4, 5]);

        const generator2 = getGenerator([1, 2]);
        const stream2 = new AsyncStream(generator2());

        await expect(stream2.take(5).collect()).resolves.toEqual([1, 2]);
        await expect(stream2.collect()).resolves.toEqual([]);

        const generator3 = getGenerator<number>([1, 2, 3, 4, 5, 6]);
        const stream3 = new AsyncStream(generator3());

        await expect(stream3.take(0)).toEqual(stream3);
        await expect(stream3.collect()).resolves.toEqual([1, 2, 3, 4, 5, 6]);

        const generator4 = getGenerator<number>([1, 2, 3, 4, 5, 6]);
        const stream4 = new AsyncStream(generator4());

        await expect(stream4.take(3).collect()).resolves.toEqual([1, 2, 3]);
        await expect(stream4.take(2).collect()).resolves.toEqual([4, 5]);
        await expect(stream4.collect()).resolves.toEqual([6]);

        const generator5 = getGenerator([1, 2, 3, 4, 5, 6]);

        const stream5 = new AsyncStream(generator5());

        expect(() => stream5.take(-1)).toThrow(
            'n must be a non-negative integer.'
        );
    });

    test('takeLast function', async () => {
        const generator = getGenerator([1, 2, 3, 4, 5]);
        const stream = new AsyncStream(generator());

        await expect(stream.takeLast(3).collect()).resolves.toEqual([3, 4, 5]);
        await expect(stream.collect()).resolves.toEqual([]);

        const generator2 = getGenerator([1, 2]);
        const stream2 = new AsyncStream(generator2());

        await expect(stream2.takeLast(5).collect()).resolves.toEqual([1, 2]);
        await expect(stream2.collect()).resolves.toEqual([]);

        const generator3 = getGenerator([1, 2, 3, 4, 5, 6]);
        const stream3 = new AsyncStream(generator3());

        expect(() => stream3.takeLast(0)).toThrow(
            'n must be a positive integer.'
        );
        await expect(stream3.collect()).resolves.toEqual([1, 2, 3, 4, 5, 6]);

        const generator4 = getGenerator([1, 2, 3, 4, 5, 6]);
        const stream4 = new AsyncStream(generator4());

        await expect(stream4.takeLast(3).collect()).resolves.toEqual([4, 5, 6]);
        await expect(stream4.takeLast(2).collect()).resolves.toEqual([]);
        await expect(stream4.collect()).resolves.toEqual([]);

        const generator5 = getGenerator([1, 2, 3, 4, 5, 6]);

        const stream5 = new AsyncStream(generator5());

        expect(() => stream5.takeLast(-1)).toThrow(
            'n must be a positive integer.'
        );
    });

    test('count function', async () => {
        const generator = getGenerator([1, 2, 3, 4, 5]);
        const stream = new AsyncStream(generator());

        await expect(stream.count()).resolves.toBe(5);
        await expect(stream.collect()).resolves.toEqual([]);
    });
});
