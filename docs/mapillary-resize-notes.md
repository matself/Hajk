# Mapillary plugin: viewer resize notes

Technical note on the `mapillary-js` viewer resize handling in
[`apps/client/src/plugins/Mapillary`](../apps/client/src/plugins/Mapillary/).
Not a user-facing guide — kept here because this exact bug went through many
revert cycles before landing on this approach, so the reasoning is worth
keeping around.

## The problem

The Mapillary viewer's WebGL canvas would get stuck rendering at its
original size (or a fixed ~200px height) whenever its container's actual
size changed. Two situations trigger this:

1. **Initial reveal.** The container starts as `display: none` (0×0) while
   the `Viewer` is constructed, and is only switched to `flex` afterwards
   (`MapillaryView.tsx`, in response to the `locationChanged` event). The
   canvas is created against a 0×0 box.
2. **Window resize.** Hajk's `Window` (`react-rnd`) resizes the plugin
   window's DOM box directly. `mapillary-js` doesn't know this happened
   unless told.

`mapillary-js`'s own `trackResize` option only listens for the browser
*window*'s `resize` event — it does not see either of the above, since
neither one changes the browser window's size. The fix has to explicitly
call `Viewer.resize()` after the container's box actually changes.

## What didn't work well

Earlier iterations called `viewer.resize()` from fixed-delay `setTimeout`
chains (`[0, 100, 250, 500, 1000]` ms, each wrapped in a `requestAnimationFrame`)
after both the reveal and the `Window.jsx` `onResize` callback. This
happened to work but is guessing at a layout timing race rather than
observing it, and left a pile of throwaway diagnostic logging in the
codebase.

## The fix: `ResizeObserver`

`MapillaryModel.ts` now attaches a `ResizeObserver` directly to the
container element (`#mapillary-window`) at the same time the `Viewer` is
constructed, and calls `viewer.resize()` on every observed size change:

```
Hajk Window resizes (react-rnd) ──┐
                                   ├─► container's box changes ─► ResizeObserver ─► viewer.resize()
display:none → flex reveal ───────┘
```

This covers both trigger cases with one mechanism, fires only when the size
has actually changed (no polling, no fixed delays), and needs no knowledge
of *why* the container changed size. `trackResize` is set to `false` on the
`Viewer` since the observer supersedes it.

`Window.jsx`'s existing `onResize` plugin callback is left wired up as a
cheap fallback (`MapillaryModel.resize()` → `viewer.resize()`), but is not
expected to be load-bearing — the `ResizeObserver` is what keeps the canvas
in sync in practice.

The observer is disconnected in `MapillaryModel.deactivate()` alongside the
viewer teardown, so nothing leaks across activate/deactivate cycles.
