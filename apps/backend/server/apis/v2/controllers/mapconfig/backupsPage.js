/**
 * @summary A minimal, self-contained page for browsing and restoring map config backups.
 * @description Not part of the React admin build - a plain HTML/JS page served by the
 * backend behind restrictAdmin (same gate as the rest of the mapconfig API). It is opened
 * from the admin "Kartor" toolbar with a ?map=<name> query parameter and is deliberately
 * locked to that single map. It talks to:
 *   GET  /api/v2/mapconfig/backups/:map       (list)
 *   GET  /api/v2/mapconfig/backups/:map/:id   (preview one backup)
 *   PUT  /api/v2/mapconfig/restore/:map/:id   (restore)
 * Fetches use paths relative to this page, so it works behind any host/proxy.
 */
export function backupsPageHtml() {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Hajk Admin - Säkerhetskopior</title>
<style>
  :root { --blue: #1976d2; --blue-dark: #115293; --red: #c62828; --border: #ddd; --muted: #666; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: #f2f2f2; margin: 0; color: #222; }
  header { background: #fff; border-bottom: 1px solid var(--border); padding: 1rem 1.5rem; }
  header h1 { font-size: 1.15rem; margin: 0; }
  header p { margin: .35rem 0 0; color: var(--muted); font-size: .9rem; }
  header code { background: #eef; padding: .1rem .35rem; border-radius: 3px; }
  main { padding: 1.5rem; max-width: 60rem; margin: 0 auto; }
  #status { min-height: 1.4em; margin-bottom: .75rem; font-size: .9rem; }
  #status.error { color: var(--red); }
  #status.ok { color: #2e7d32; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  th, td { text-align: left; padding: .6rem .75rem; border-bottom: 1px solid var(--border); font-size: .9rem; }
  th { background: #fafafa; font-weight: 600; }
  tr:last-child td { border-bottom: none; }
  .tag { display: inline-block; font-size: .72rem; padding: .1rem .45rem; border-radius: 10px; background: #eee; color: #555; }
  .tag.pre-restore { background: #fff3e0; color: #e65100; }
  .tag.pre-delete { background: #fce4ec; color: #ad1457; }
  button { font: inherit; border: none; border-radius: 4px; padding: .35rem .7rem; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  .btn-restore { background: var(--blue); color: #fff; }
  .btn-restore:hover:not(:disabled) { background: var(--blue-dark); }
  .btn-preview { background: #eee; color: #333; margin-right: .4rem; }
  .empty { padding: 2rem; text-align: center; color: var(--muted); background: #fff; border: 1px solid var(--border); border-radius: 6px; }
  dialog { border: none; border-radius: 8px; padding: 0; max-width: 90vw; width: 44rem; box-shadow: 0 6px 30px rgba(0,0,0,.25); }
  dialog header { display: flex; justify-content: space-between; align-items: center; }
  dialog pre { margin: 0; padding: 1rem 1.5rem; max-height: 60vh; overflow: auto; font-size: .8rem; background: #1e1e1e; color: #d4d4d4; }
  dialog button.close { background: #eee; }
</style>
</head>
<body>
<header>
  <h1>Säkerhetskopior</h1>
  <p>Karta: <code id="map-name">-</code>. En kopia sparas automatiskt varje gång kartan ändras. Vid återställning sparas den nuvarande versionen först.</p>
</header>
<main>
  <div id="status"></div>
  <div id="list">Laddar…</div>
</main>

<dialog id="preview">
  <header style="padding:.75rem 1.5rem;border-bottom:1px solid var(--border);">
    <strong id="preview-title">Förhandsgranskning</strong>
    <button class="close" onclick="document.getElementById('preview').close()">Stäng</button>
  </header>
  <pre id="preview-body"></pre>
</dialog>

<script>
  const params = new URLSearchParams(location.search);
  const map = params.get("map");
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("list");
  document.getElementById("map-name").textContent = map || "(saknas)";

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = kind || "";
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " kB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString("sv-SE");
  }

  async function load() {
    if (!map) {
      listEl.innerHTML = '<div class="empty">Ingen karta angiven.</div>';
      return;
    }
    setStatus("");
    listEl.textContent = "Laddar…";
    try {
      const res = await fetch("backups/" + encodeURIComponent(map), { credentials: "same-origin" });
      if (!res.ok) throw new Error("Kunde inte hämta listan (" + res.status + ").");
      const backups = await res.json();
      render(backups);
    } catch (err) {
      listEl.innerHTML = "";
      setStatus(err.message, "error");
    }
  }

  function render(backups) {
    if (!Array.isArray(backups) || backups.length === 0) {
      listEl.innerHTML = '<div class="empty">Inga säkerhetskopior ännu. En kopia skapas nästa gång kartan sparas.</div>';
      return;
    }
    const rows = backups.map((b) => {
      const tagClass = b.label === "pre-restore" || b.label === "pre-delete" ? b.label : "";
      return '<tr>' +
        '<td>' + fmtDate(b.createdAt) + '</td>' +
        '<td><span class="tag ' + tagClass + '">' + b.label + '</span></td>' +
        '<td>' + fmtSize(b.size) + '</td>' +
        '<td style="text-align:right;white-space:nowrap;">' +
          '<button class="btn-preview" data-id="' + b.id + '">Förhandsgranska</button>' +
          '<button class="btn-restore" data-id="' + b.id + '">Återställ</button>' +
        '</td>' +
      '</tr>';
    }).join("");
    listEl.innerHTML =
      '<table><thead><tr><th>Tidpunkt</th><th>Typ</th><th>Storlek</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>';

    listEl.querySelectorAll(".btn-preview").forEach((btn) =>
      btn.addEventListener("click", () => preview(btn.dataset.id))
    );
    listEl.querySelectorAll(".btn-restore").forEach((btn) =>
      btn.addEventListener("click", () => restore(btn.dataset.id, btn))
    );
  }

  async function preview(id) {
    setStatus("");
    try {
      const res = await fetch("backups/" + encodeURIComponent(map) + "/" + encodeURIComponent(id), { credentials: "same-origin" });
      if (!res.ok) throw new Error("Kunde inte hämta kopian (" + res.status + ").");
      const json = await res.json();
      document.getElementById("preview-title").textContent = id;
      document.getElementById("preview-body").textContent = JSON.stringify(json, null, 2);
      document.getElementById("preview").showModal();
    } catch (err) {
      setStatus(err.message, "error");
    }
  }

  async function restore(id, btn) {
    if (!confirm("Återställ kartan '" + map + "' till versionen från:\\n\\n" + id + "\\n\\nDen nuvarande versionen sparas som en säkerhetskopia först.")) {
      return;
    }
    setStatus("Återställer…");
    document.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      const res = await fetch("restore/" + encodeURIComponent(map) + "/" + encodeURIComponent(id), {
        method: "PUT",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Återställning misslyckades (" + res.status + ").");
      setStatus("Kartan återställdes. Ladda om admin-fliken för att se den återställda versionen.", "ok");
      await load();
    } catch (err) {
      setStatus(err.message, "error");
    } finally {
      document.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  }

  load();
</script>
</body>
</html>`;
}
