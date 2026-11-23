# Contract: Device Storage

All keys are in `localStorage`. Each value is JSON with a `v` field. A key
that fails to parse, or has an unknown `v`, is deleted and treated as
absent. A failed write never stops the game.

## `ws:v1:game`

```json
{
  "v": 1,
  "puzzleId": 300042,
  "values": [5,3,4,0, "... 81 ints ..."],
  "candidates": [0,0,0,0, "... 81 bit masks ..."],
  "elapsedMs": 461230,
  "status": "playing",
  "assisted": false,
  "savedAt": "2026-11-23T10:15:00Z"
}
```

- Written after every move, on pause, on page hide, and every 5 s while
  playing.
- On load, `status: "playing"` is restored as `paused` until the page is
  visible, so hidden time is never counted.
- Restore is rejected (key deleted) if a given cell in `values` differs from
  the catalog givens.

## `ws:v1:best`

```json
{ "v": 1, "times": { "300042": { "timeMs": 461230, "date": "2026-11-23" } } }
```

## `ws:v1:settings`

```json
{ "v": 1, "theme": "auto", "highlightConflicts": true, "inputMode": "value" }
```
