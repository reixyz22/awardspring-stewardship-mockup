# Study notes

Things in this repo whose syntax is easy to paste and hard to explain live.
Add to this as we build. Written to re-read before the interview, not for anyone else.

---

## 1. `async` / `await` — why every fetch call has it

```ts
const donor = await apiGet<DonorDetail>(`/api/v1/donors/${id}`);
```

A network request takes real time (milliseconds, but not zero). `await` means
"pause this function here, let the rest of the page keep working, and resume
with the result once it arrives." Without it you'd get a `Promise` object
instead of the actual donor data — a placeholder for "this will exist later,"
not the thing itself.

`async` on a function is what makes `await` legal inside it. It also means the
function itself now returns a `Promise`, always, even if you `return` a plain
value.

**Say this in an interview:** "async/await is JavaScript's way of writing
asynchronous code — code that waits on something slow, like a network call —
without blocking the rest of the program while it waits."

---

## 2. `apiGet<T>` — what the `<T>` is doing

```ts
export async function apiGet<T>(path: string, ...): Promise<T> { ... }

const donor = await apiGet<DonorDetail>(`/api/v1/donors/${id}`);
```

This is a **generic**. `apiGet` doesn't know or care what shape of data it's
fetching — it just does `fetch()` and returns JSON. The `<T>` is a placeholder
you fill in at the call site: "trust me, whatever comes back is shaped like
`DonorDetail`." TypeScript then lets you use `donor.first_name` with
autocomplete and a red squiggle if you typo a field name.

It's the same function reused for every endpoint — `apiGet<Gift>`,
`apiGet<Fund>` — instead of writing a separate fetch function per type.

**Say this in an interview:** "Generics let one function work across many
types safely. `apiGet<T>` fetches JSON and tells TypeScript what shape to
expect, so the type system catches mistakes instead of a bug showing up at
runtime."

The return type is written `Promise<T>`, not just `T`. That's two of the ideas
above stacked: it's a Promise because the function is `async` (point 1), and
it's generic in `T` (this point), so "the placeholder-shaped thing that
resolves eventually" is the honest, precise type. `experiments/fetch-strategy.ts`
has a small standalone example: `get<T>(path): Promise<T>`.

---

## 3. `Promise.all([...])` — running requests at the same time

```ts
const [donor, gifts, activities] = await Promise.all([
  apiGet<DonorDetail>(`/api/v1/donors/${id}`),
  apiList<Gift>('/api/v1/gifts', { donor_id: id }),
  apiList<DonorActivity>(`/api/v1/donors/${id}/activities`),
]);
```

These three calls don't depend on each other, so there's no reason to wait for
one to finish before starting the next. `Promise.all` fires them all at once
and gives you back an array of results in the same order once **all** of them
are done. If you'd written three separate `await` lines back to back, they'd
run one after another instead — same result, three times slower.

**Say this in an interview:** "When requests are independent I batch them with
`Promise.all` so they run in parallel instead of serially — it's a real
performance difference, not just style."

---

## 4. The N+1 pattern — the thing this whole project is trying to be honest about

```ts
const list = await apiList<DonorListItem>('/api/v1/donors');       // 1 request
const details = await Promise.all(
  list.data.map((d) => apiGet<DonorDetail>(`/api/v1/donors/${d.id}`)) // N requests
);
```

"N+1" means: 1 request to get a list, then N more requests (one per item) to
get the detail each row actually needs. It's a classic, well-known
inefficiency — the fix in a real system is usually "ask the API for a
richer list response" or "batch the detail calls" — and here it isn't
hidden, it's the whole point: `DonorListItemV1` in their spec just doesn't
carry `quick_stats`, so there is no cheaper way to get lifetime totals with
this API as documented. The donor list screen prints the real request count
for exactly this reason.

**Say this in an interview:** "I know what N+1 is and I can point to the exact
schema field that makes it unavoidable here, rather than papering over it."

---

## 5. Optional chaining `?.` and nullish coalescing `??`

```ts
donor.detail?.quick_stats.lifetime_total
qs.year_total ?? 0
```

`?.` — "if the thing on the left is `null` or `undefined`, stop and return
`undefined` instead of throwing an error." Used because `detail` doesn't exist
yet on first render, before the fetch finishes.

`??` — "use the right-hand value only if the left side is `null` or
`undefined`" (NOT just falsy — `0` and `''` are left alone, unlike `||`).
Used because `year_total` can legitimately be `0`, and `0 || 0` would silently
also catch a real zero.

**Say this in an interview:** "`??` is stricter than `||` on purpose — it only
falls back on null/undefined, so a real zero-dollar value doesn't accidentally
get replaced."
