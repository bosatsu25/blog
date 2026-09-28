# Web Security Testing

This site treats security as a software quality characteristic that must be continuously verified.

The current security model intentionally focuses on the public web application and browser attack surface. GitHub account hardening, repository access policy, and Cloudflare edge controls are outside this phase.

## Security objectives

The site is designed to remain a small static application with no authentication, database, forms, analytics, advertising, or third-party runtime dependencies.

The security quality gate protects the following invariants:

- deny resource loading by default with Content Security Policy
- do not allow third-party runtime network requests
- do not expose project source, dependency metadata, environment files, or source maps
- do not introduce raw HTML or common executable DOM sinks without an explicit architecture change
- do not expose forms, frames, plugins, or embedded documents by accident
- do not reflect query-string input into rendered page content
- do not leak referrer context when leaving the site
- keep interactive islands functional under the production CSP

## Content Security Policy

Astro generates a CSP meta policy during production builds.

The policy uses a default-deny model:

```text
default-src 'none'
img-src 'self' data:
font-src 'self'
connect-src 'none'
object-src 'none'
base-uri 'none'
form-action 'none'
frame-src 'none'
media-src 'none'
worker-src 'none'
```

Astro additionally generates the required `script-src` and `style-src` hashes for its own output.

Markdown syntax highlighting uses Prism instead of Shiki because the security policy does not allow inline styles.

## Automated checks

### Static security audit

`npm run security:audit` inspects source and the production artifact.

It fails when it detects:

- `set:html`
- `dangerouslySetInnerHTML`
- `innerHTML` assignment
- `eval()`
- `new Function()`
- `document.write()`
- environment files in `dist/`
- package metadata in `dist/`
- `.git`, `src`, or `node_modules` in `dist/`
- source maps in `dist/`
- production HTML without CSP
- third-party executable or media resources

These checks are intentionally strict. If the architecture later needs one of these capabilities, the security model and tests must be changed explicitly rather than silently weakening the gate.

### Production browser security tests

`npm run test:security` builds the production site and runs Playwright against `astro preview`.

The suite verifies:

- required CSP directives
- absence of `unsafe-inline` and `unsafe-eval`
- `no-referrer` policy
- zero third-party subresource requests
- no CSP/runtime console errors
- ThemeToggle still hydrates and works under CSP
- no `form`, `iframe`, `object`, or `embed` attack surface
- common sensitive paths return 404
- query strings are not reflected into rendered content
- external GitHub links use `noopener noreferrer`

## Deferred edge controls

Some controls require HTTP response-header or edge-layer support and are intentionally deferred until the custom domain / edge phase:

- HSTS
- `frame-ancestors` clickjacking protection
- `X-Content-Type-Options: nosniff`
- Permissions Policy
- COOP / CORP
- WAF, bot controls, and rate limiting

These controls should be added only after the edge layer is introduced, then covered by production HTTP security tests.
