# Mapillary plugin: viewer resize notes

Technical note on the `mapillary-js` viewer sizing in
[`apps/client/src/plugins/Mapillary`](../apps/client/src/plugins/Mapillary/).
Not a user-facing guide — kept here because this exact bug went through many
revert cycles (and two different root-cause theories) before landing here,
so the reasoning is worth keeping around.

## Symptom

The Mapillary viewer's image area was capped at a fixed ~200px height
inside the plugin window, regardless of how tall the window actually was -
including right after the window first opened, with no resize involved.

## First theory (wrong): a resize-timing race

The initial read was that `mapillary-js` wasn't finding out about size
changes: the container starts as `display: none` (0×0) while the `Viewer`
is constructed and only switches to `flex` afterwards
(`MapillaryView.tsx`, in response to the `locationChanged` event), and
`mapillary-js`'s own `trackResize` option only listens for the *browser
window's* `resize` event, not a container's own size changing. That's a
real gap, and is worth closing - `MapillaryModel.ts` now attaches a
`ResizeObserver` directly to the container at `Viewer` construction time
and calls `viewer.resize()` on every observed size change, replacing
earlier fixed-delay `setTimeout` chains (`[0, 100, 250, 500, 1000]` ms) that
guessed at the timing instead of observing it. `trackResize` is set to
`false` since the observer supersedes it, and the observer is disconnected
in `deactivate()`.

But this didn't fix the symptom - because it wasn't the actual cause. The
container's own measured size (`getBoundingClientRect()`) was genuinely
200px tall, not just late to be read. No amount of re-triggering
`viewer.resize()` helps when the container really is that size.

## Real root cause: a CSS specificity conflict, not a timing race

`MapillaryWindow`, the div `mapillary-js` renders into, was styled
`position: absolute` with `top`/`bottom`/`left`/`right` offsets, sized
against a distant positioned ancestor (`Window.jsx`'s `PanelContent`) so it
would fill the window regardless of its immediate parent's own height.

`mapillary-js` unconditionally adds its own `mapillary-viewer` class to the
container element on construction. That class carries a stylesheet rule -
`position: relative` - imported from `mapillary-js/dist/mapillary.css`,
which the library needs so its own internal canvas/controls (themselves
`position: absolute`) have something to anchor to. That rule has the same
specificity as or higher than the app's own class-based `position: absolute`
(and, being imported later, wins the cascade either way), so it silently
overrode our `position: absolute` back to `relative`. Once the container is
merely `position: relative`, its `top`/`bottom`/`left`/`right` offsets stop
sizing it and become plain visual offsets instead - its actual height falls
back to normal flow, which was governed by an intermediate wrapper `Box`
that only had `minHeight: "200px"` and nothing pulling it up to the
window's full available height. Hence the exact, constant 200px cap,
independent of window size or timing.

This is a legitimate, unavoidable requirement of `mapillary-js`, not a bug
in the library - fighting it with our own `position: absolute` on the same
element was never going to hold up.

## The fix: flex layout instead of absolute positioning

`MapillaryView.tsx` no longer tries to position the container against a
distant ancestor at all. Instead:

- The view's root `Box` is `display: flex; flexDirection: column; height: 100%`,
  so it fills `Window.jsx`'s content section top to bottom.
- `ViewerArea` (the box wrapping the image + date overlay) is `flex: 1`
  instead of `minHeight: 200px`, so it grows to fill whatever space remains
  below the instruction text.
- `MapillaryWindow` (`#mapillary-window`, the actual `mapillary-js`
  container) is `flex: 1` too, filling `ViewerArea` on both axes.

None of these rely on `position: absolute` on the container itself, so
`mapillary-js` forcing it to `position: relative` is no longer a conflict -
the container is sized by flex layout either way. `DateWrapper` (the image
date overlay) keeps `position: absolute`, now anchored via `ViewerArea`'s
`position: relative` instead of a hardcoded header-height offset.

The `ResizeObserver` fix above is still worth keeping - `mapillary-js`
still needs to be told when its container's size changes - but it was
solving a real, separate, smaller problem that happened to be masked by
this larger layout bug.
