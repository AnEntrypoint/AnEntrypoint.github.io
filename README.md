# AnEntrypoint.github.io

Org root GitHub Pages site. Currently hosts only [nygrok](https://github.com/AnEntrypoint/nygrok)'s
browser client, deliberately at the **domain root** rather than a project
subpage (`/nygrok/`).

## Why root, not a project page

nygrok's browser client registers a service worker to act as a reverse
proxy for whatever localhost site is being tunneled. A service worker's
interception scope is capped at the directory it's served from, and GitHub
Pages gives no way to widen that (no custom response headers, so
`Service-Worker-Allowed` isn't achievable) — a service worker served from a
project page (`/nygrok/sw.js`) can only ever intercept requests under
`/nygrok/`.

Some real apps load resources via `import()` with a hardcoded **absolute
root path** (e.g. a plugin loader doing `import('/plugins/foo/client.js')`)
— a request nygrok's static HTML/JS rewriting can't see coming and the
browser's module resolver never routes through `fetch`/`XHR`, so no
JavaScript-level shim can catch it either. Only a root-scoped service
worker can intercept it. Hence this repo.

## Contents

Built output from [`AnEntrypoint/nygrok`](https://github.com/AnEntrypoint/nygrok)'s
`web/` directory (`npm run build:web`) — `index.html`, `bundle.js`, `sw.js`,
and their source maps. No source lives here; update by rebuilding in the
nygrok repo and copying the output over.

Every tunnel session still lives under its own `/t/<seed>/` path (multiple
concurrent tunnels, and nygrok's own bootstrap page, coexist fine at root)
— going root-scoped only changes what the service worker is *allowed* to
intercept, not the URL scheme tunneled content is served under.
