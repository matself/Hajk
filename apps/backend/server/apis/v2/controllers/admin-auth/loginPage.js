/**
 * @summary A minimal, self-contained login page for the native admin password gate.
 * @description Not part of the React admin build - just a plain HTML/JS form that
 * posts to POST /api/v2/admin-auth/login and reloads the page on success.
 */
export function adminLoginPageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Hajk Admin - Login</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f2f2f2; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  form { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.15); width: 20rem; }
  h1 { font-size: 1.1rem; margin: 0 0 1rem; }
  input { width: 100%; box-sizing: border-box; padding: .5rem; margin-bottom: .75rem; border: 1px solid #ccc; border-radius: 4px; }
  button { width: 100%; padding: .5rem; border: none; border-radius: 4px; background: #1976d2; color: #fff; cursor: pointer; }
  button:disabled { opacity: .6; cursor: default; }
  #error { color: #c62828; font-size: .85rem; min-height: 1.2em; margin-bottom: .5rem; }
</style>
</head>
<body>
<form id="login-form">
  <h2>HAJK Admin UI</h1>
  <input type="password" id="password" name="password" placeholder="Password" autofocus required />
  <div id="error"></div>
  <button type="submit">Log in</button>
</form>
<script>
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    const errorEl = document.getElementById("error");
    errorEl.textContent = "";
    btn.disabled = true;
    try {
      const res = await fetch("/api/v2/admin-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: document.getElementById("password").value }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        errorEl.textContent = res.status === 429 ? "Too many attempts, try again later." : "Wrong password.";
        btn.disabled = false;
      }
    } catch {
      errorEl.textContent = "Login failed, please try again.";
      btn.disabled = false;
    }
  });
</script>
</body>
</html>`;
}
