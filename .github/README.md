# AsyncStream

Tools for dealing with streaming data from `AsyncIterableIterators`

For example, suppose you have an async generator that yields all the natural numbers:

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}
```

You can use `AsyncStream` to create a stream of natural numbers and then apply various transformations to it:

```typescript
import AsyncStream from '@giancarl021/async-stream';

const stream = new AsyncStream(naturalNumbers());

const result = await stream
    .filter(n => n % 2 === 0) // Keep only even numbers
    .map(n => n * n) // Square the numbers
    .pack(2) // Group into pairs
    .take(5) // Take the first 5 pairs
    .collect(); // Collect the results into an array

console.log(result); // Output: [ [ 4, 16 ], [ 36, 64 ], [ 100, 144 ], [ 196, 256 ], [ 324, 400 ] ]
```

## Summary

- [Installation](#installation)
- [Usage](#usage)
    - [AsyncStream.from](#asyncstreamfrom)
    - [AsyncStream.empty](#asyncstreamempty)
    - [`AsyncIterableIterator` functions](#asynciterableiterator-functions)
    - [pack](#pack)
    - [repack](#repack)
    - [flat](#flat)
    - [map](#map)
    - [filter](#filter)
    - [reduce](#reduce)
    - [forEach](#foreach)
    - [collect](#collect)
    - [drain](#drain)
    - [skip](#skip)
    - [first](#first)
    - [last](#last)
    - [take](#take)
    - [takeLast](#takelast)
    - [count](#count)
- [Contributing](#contributing)

## Installation

Go back to [Summary](#summary)

npm:

```bash
# NPM
npm install --save @giancarl021/async-stream
# Yarn
yarn add @giancarl021/async-stream
# PNPM
pnpm add @giancarl021/async-stream
```

## Usage

Go back to [Summary](#summary)

First you need to instantiate an `AsyncStream` object with an `AsyncIterableIterator`:

```typescript
async function* myGenerator() {
    // ...
}

const stream = new AsyncStream(myGenerator());
```

Afterwards, you can chain various methods to transform or consume the stream.

> **Important:** The `AsyncStream` class is derived from `AsyncIterableIterator`, so you can use it in any context that requires an `AsyncIterableIterator`.

### AsyncStream.from

Go back to [Summary](#summary)

The `AsyncStream.from` static method creates an `AsyncStream` from an `Array`.

This method is useful when you want to create a stream from a finite set of already known items.

```typescript
const stream = AsyncStream.from([1, 2, 3, 4, 5]);
const result = await stream.collect();
console.log(result); // Output: [ 1, 2, 3, 4, 5 ]
```

### AsyncStream.empty

Go back to [Summary](#summary)

The `AsyncStream.empty` static method creates an empty `AsyncStream`.

This method is useful when you want to create a stream that has no items.

```typescript
const stream = AsyncStream.empty<number>();
const result = await stream.collect();
console.log(result); // Output: []
```

### `AsyncIterableIterator` functions

Go back to [Summary](#summary)

The `AsyncStream` class implements the `AsyncIterableIterator` interface, which means it has the following methods:

- `next(value?: any): Promise<IteratorResult<T>>`: Advances the iterator and returns the next result.
- `return(value?: any): Promise<IteratorResult<T>>`: Completes the iterator and returns the final result.
- `throw(e?: any): Promise<IteratorResult<T>>`: Throws an error into the iterator.
- `[Symbol.asyncIterator](): AsyncIterableIterator<T>`: Returns the async iterator itself.

These methods allow you to manually control the iteration process if needed.

### pack

Go back to [Summary](#summary)

The `pack` method groups items from the stream into arrays of a specified size.

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbers());

const packed = stream.pack(3); // Groups items into arrays of 3

const result = await packed.take(2).collect(); // Take the first 2 groups

console.log(result); // Output: [ [ 1, 2, 3 ], [ 4, 5, 6 ] ]
```

### repack

Go back to [Summary](#summary)

The `repack` method regroups items from the stream into arrays of a new specified size.

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbers()).pack(4); // Initial pack of 4
const repacked = stream.repack(2); // Regroup into arrays of 2

const result = await repacked.take(3).collect(); // Take the first 3 groups

console.log(result); // Output: [ [ 1, 2 ], [ 3, 4 ], [ 5, 6 ] ]
```

### flat

Go back to [Summary](#summary)

The `flat` method flattens nested arrays in the stream.

```typescript
async function* nestedArrays() {
    yield [1, 2];
    yield [3, 4];
    yield [5, 6];
}

const stream = new AsyncStream(nestedArrays());

const flattened = stream.flat();

const result = await flattened.collect();

console.log(result); // Output: [ 1, 2, 3, 4, 5, 6 ]
```

> **Note:** The `flat` method only flattens one level of nesting. If you have deeper nested arrays, you may need to call `flat` multiple times or use a custom flattening function with [`map`](#map).

The `flat` method is directly inverse to the [`pack`](#pack) method:

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const result1 = await new AsyncStream(naturalNumbers())
    .pack(3)
    .flat()
    .take(5)
    .collect();
const result3 = await new AsyncStream(naturalNumbers()).take(5).collect();

console.log(result1); // Output: [ 1, 2, 3, 4, 5 ]
console.log(result2); // Output: [ 1, 2, 3, 4, 5 ]
```

### map

Go back to [Summary](#summary)

The `map` method applies a transformation function to each item in the stream.

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbers());

const mapped = stream.map(n => n * n); // Square each number

const result = await mapped.take(5).collect(); // Take the first 5 squared numbers

console.log(result); // Output: [ 1, 4, 9, 16, 25 ]
```

### filter

Go back to [Summary](#summary)

The `filter` method filters items in the stream based on a predicate function.

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbers());

const filtered = stream.filter(n => n % 2 === 0); // Keep only even numbers
const result = await filtered.take(5).collect(); // Take the first 5 even numbers

console.log(result); // Output: [ 2, 4, 6, 8, 10 ]
```

### reduce

Go back to [Summary](#summary)

The `reduce` method reduces the stream to a single value using a reducer function and an initial value.

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbers());
const sum = await stream.take(5).reduce((acc, n) => acc + n, 0); // Sum the first 5 numbers

console.log(sum); // Output: 15 (1 + 2 + 3 + 4 + 5)
```

> **Warning:** Do not use `reduce` on infinite streams, as it will not terminate and will continue to process items indefinitely, potentially leading to memory exhaustion. To safely use `reduce`, first limit the stream using methods like [`take`](#take).

### forEach

Go back to [Summary](#summary)

The `forEach` method executes a provided function once for each item in the stream.

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbers());
await stream.take(5).forEach(n => console.log(n)); // Logs the first 5 numbers

// Output: 1
//         2
//         3
//         4
//         5
```

### collect

Go back to [Summary](#summary)

The `collect` method collects all items from the stream into an array.

```typescript
async function* naturalNumbersUpTo100() {
    let n = 1;
    while (n <= 100) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbersUpTo100());
const allNumbers = await stream.collect(); // Collect all numbers into an array

console.log(allNumbers); // Output: [ 1, 2, 3, ..., 100 ]
```

> **Warning:** Do not use `collect` on infinite streams, as it will not terminate and will continue to accumulate items indefinitely, potentially leading to memory exhaustion. To safely use `collect`, first limit the stream using methods like [`take`](#take).

### drain

Go back to [Summary](#summary)

The `drain` method consumes the stream without doing anything with the items.

```typescript
async function* naturalNumbersUpTo100() {
    let n = 1;
    while (n <= 100) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbersUpTo100());
await stream.drain(); // Consumes the stream without doing anything

const result = await stream.collect();

console.log(result); // Output: []
```

> **Warning:** Do not use `drain` on infinite streams, as it will not terminate and will continue to process items indefinitely, potentially leading to memory exhaustion. To safely use `drain`, first limit the stream using methods like [`take`](#take).

### skip

Go back to [Summary](#summary)

The `skip` method skips the first N items from the stream.

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbers());
const result = await stream
    .skip(5) // Skip the first 5 numbers
    .take(5) // Take the next 5 numbers
    .collect(); // Collect the results into an array

console.log(result); // Output: [ 6, 7, 8, 9, 10 ]
```

### first

Go back to [Summary](#summary)

The `first` method retrieves the first item from the stream.

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbers());
const firstItem = await stream.first(); // Get the first item

console.log(firstItem); // Output: 1
```

### last

Go back to [Summary](#summary)

The `last` method retrieves the last item from the stream.

```typescript
async function* naturalNumbersUpTo100() {
    let n = 1;
    while (n <= 100) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbersUpTo100());
const lastItem = await stream.last(); // Get the last item

console.log(lastItem); // Output: 100

const result = await stream.collect(); // Collect remaining items (none, as the stream as consumed by the last() call)
console.log(result); // Output: []
```

> **Warning:** Do not use `last` on infinite streams, as it will not terminate and will continue to process items indefinitely, potentially leading to memory exhaustion. To safely use `last`, first limit the stream using methods like [`take`](#take).

### take

Go back to [Summary](#summary)

The `take` method retrieves up to the first N items from the stream.

```typescript
async function* naturalNumbers() {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbers());
const result = await stream
    .take(5) // Take the first 5 numbers
    .collect(); // Collect the results into an array

console.log(result); // Output: [ 1, 2, 3, 4, 5 ]
```

### takeLast

Go back to [Summary](#summary)

The `takeLast` method retrieves up to the last N items from the stream.

```typescript
async function* naturalNumbersUpTo100() {
    let n = 1;
    while (n <= 100) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbersUpTo100());
const result = await stream
    .takeLast(5) // Take the last 5 numbers
    .collect(); // Collect the results into an array

console.log(result); // Output: [ 96, 97, 98, 99, 100 ]
```

> **Warning:** Do not use `takeLast` on infinite streams, as it will not terminate and will continue to process items indefinitely, potentially leading to memory exhaustion. To safely use `takeLast`, first limit the stream using methods like [`take`](#take).

> **Note:** The `takeLast` method requires storing up to N items in memory, so be cautious when using it with large values of N.

### count

Go back to [Summary](#summary)

The `count` method counts the total number of items in the stream.

```typescript
async function* naturalNumbersUpTo100() {
    let n = 1;
    while (n <= 100) {
        yield n++;
    }
}

const stream = new AsyncStream(naturalNumbersUpTo100());
const totalCount = await stream.count(); // Count the total number of items

console.log(totalCount); // Output: 100
```

> **Warning:** Do not use `count` on infinite streams, as it will not terminate and will continue to process items indefinitely, potentially leading to memory exhaustion. To safely use `count`, first limit the stream using methods like [`take`](#take).

> **Note:** The `count` method consumes the stream, so after calling it, the stream will be empty.

## Contributing

Go back to [Summary](#summary)

Contributions are welcome! Please open an issue or a pull request on GitHub.

Currently the code is 100% covered by tests, so please make sure to add tests for any new functionality.
