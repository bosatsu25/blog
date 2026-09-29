# Web Security Testing

This site treats security as a software quality characteristic that must be continuously verified.

The current security model intentionally focuses on the public web application and browser attack surface. GitHub account hardening, repository access policy, and other platform-level controls are outside this project’s runtime boundary.

## Security objectives

The site is designed to remain a small static application with no authentication, database, forms, analytics, advertising, or third-party runtime dependencies.

The security quality gate protects the following invariants:

- deny resource loading by default with a strict Content Security Policy
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
script-src 'self'
style-src 'self'
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

Astro additionally generates the required `script-src` and `style-src` hashes for its own output. The policy intentionally forbids `unsafe-inline`, `unsafe-eval`, wildcard origins, and unapproved third-party resource origins.

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

Before testing, the suite recursively discovers every `.html` file in `dist/` and maps its artifact path to the corresponding preview route (`index.html` maps to `/`, nested `index.html` files map to directory routes, and standalone HTML files such as `404.html` retain their filename route). The configured `SITE_BASE` is applied so project-page builds are tested at their deployed prefix. Adding a generated HTML page therefore adds it to the security suite without maintaining a route list in the test.

The tests validate the production CSP directive-by-directive, including the exact static source lists and allowing only Astro-generated SHA-256 hashes for scripts and styles:

- `default-src` is `'none'`
- `script-src` is self-authorized; generated hashes remain valid
- `style-src` is self-authorized and excludes inline CSS execution
- `img-src` allows only `self` and `data:`
- `font-src` is restricted to `self`
- `connect-src` is `'none'`
- `object-src` is `'none'`
- `base-uri` is `'none'`
- `form-action` is `'none'`
- `frame-src` is `'none'`
- `worker-src` is `'none'`
- `media-src` is `'none'`

The browser suite also checks no runtime CSP violation, no third-party requests, no unsafe external links, no reflected query strings, and no leaked sensitive files.

## Production smoke and deployment gate

`npm run test:smoke` is the production verification step for a deployed GitHub Pages site. It checks the home, About, and article routes; CSS and JavaScript loading; CSP; RSS and sitemap XML; favicon content type; theme toggle; skip-link keyboard flow; navigation; and 404 behavior. Routes are prefixed from `PAGES_URL` so a project Pages deployment is checked under `/ikesama.dev/`, not the domain root. This is intentionally separate from the local preview security tests, because the GitHub Pages environment may differ from the local `astro preview` build.

The performance budget checks raw built asset sizes, not a Lighthouse score. The current baseline is 223,480 bytes of JavaScript total (largest chunk: 212,922 bytes) and 5,274 bytes of CSS. The limits are 240 KiB total JavaScript, 230 KiB per JavaScript chunk, 12 KiB total CSS, and zero source-map bytes; the JavaScript limits provide approximately 10% growth headroom above the measured build.

The Pages deploy workflow runs only after a successful `CI` workflow for a `push` to `main`, checks out that exact tested SHA, and runs this smoke suite after deployment. Pull Request CI runs cannot trigger a deployment.

## Quality gate summary

The project’s quality gate validates:

- formatting and linting
- the Astro type check
- Vitest unit tests
- build integrity
- static security audit
- local production security checks
- accessibility checks
- production smoke checks
- performance budget checks
  rbitraryattacker-controlled input is safe. The query probe detects accidental reflection of that
  test value; it is not a general XSS proof. The network assertion observes requests made
  during page navigation and load, not arbitrary delayed behavior that requires an untested
  user action. Edge-layer controls remain out of scope.

## Deferred edge controls

Some controls require HTTP response-header or edge-layer support and are intentionally deferred until the custom domain / edge phase:

- HSTS
- `frame-ancestors` clickjacking protection
- `X-Content-Type-Options: nosniff`
- Permissions Policy
- COOP / CORP
- WAF, bot controls, and rate limiting

These controls should be added only after the edge layer is introduced, then covered by production HTTP security tests.
