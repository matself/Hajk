// Evaluated at call time so it always reflects the current hostname
// and works correctly in test/SSR environments.
function getInternalHosts() {
  return [window.location.hostname];
}

export function targetFor(url) {
  try {
    const { hostname } = new URL(url, window.location.href);
    const isInternal = getInternalHosts().some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );
    return isInternal ? "_self" : "_blank";
  } catch {
    return "_blank";
  }
}

export function applyTargetPolicy(root) {
  root.querySelectorAll("a[href]").forEach((a) => {
    const tgt = targetFor(a.href);
    a.setAttribute("target", tgt);
    if (tgt === "_blank") {
      a.setAttribute("rel", "noopener noreferrer");
    }
  });
}

// Applies target policy immediately and watches for future links via MutationObserver.
// Returns a teardown function for use in useEffect cleanup.
export function observeLinks(root) {
  applyTargetPolicy(root);

  const mo = new MutationObserver(() => applyTargetPolicy(root));
  mo.observe(root, { childList: true, subtree: true });

  return () => mo.disconnect();
}
