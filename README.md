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

console.log(result); // Outputs: [ [ 4, 16 ], [ 36, 64 ], [ 100, 144 ], [ 196, 256 ], [ 324, 400 ] ]
```

## Documentation and Source Code

The source code and documentation for this project can be found on [GitHub](https://github.com/Giancarl021/AsyncStream).
