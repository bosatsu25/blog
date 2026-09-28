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

Before testing, the suite recursively discovers every `.html` file in `dist/` and maps its
artifact path to the corresponding preview route (`index.html` maps to `/`, nested
`index.html` files map to directory routes, and standalone HTML files such as `404.html`
retain their filename route). The configured `SITE_BASE` is applied so project-page builds
are tested at their deployed prefix. Adding a generated HTML page therefore adds it to the
security suite without maintaining a route list in the test.

| Threat / risk                                                                       | Security requirement                                                                           | Test condition                                                                                                                                                                                                               | Automated test                                                                                                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A page omits or weakens the CSP or referrer policy                                  | Every generated public HTML page has the restrictive CSP and `no-referrer` policy              | Each discovered artifact route loads and exposes all required directives, without `unsafe-inline` or `unsafe-eval`                                                                                                           | `every production HTML page enforces restrictive CSP and referrer policy`                                              |
| A page loads a third-party resource or violates its CSP at runtime                  | Public pages stay same-origin and run without policy or JavaScript errors                      | Browser requests during page load use only the preview origin; CSP violation events, console errors, and uncaught page errors are absent                                                                                     | `production HTML pages make no third-party requests`; `production HTML pages have no CSP violations or runtime errors` |
| A page accidentally adds a high-risk embedded capability or unsafe new-window link  | No unapproved form/frame/plugin surface; links opening a new context use `noopener noreferrer` | Every discovered page has no `form`, `iframe`, `object`, or `embed`; every external `_blank` link has both `rel` tokens                                                                                                      | `production pages keep attack surface and external links safe`                                                         |
| User-controlled query input is echoed into output                                   | Query strings do not appear in rendered page content                                           | A unique probe supplied as a query value is absent from both the body text and serialized page HTML for each route                                                                                                           | `query-string input is not reflected into any production HTML page`                                                    |
| A generated page is omitted from the browser checks or is not served by the preview | Every production HTML artifact, including the generated 404 document, is reachable             | Each discovered artifact-derived route returns a response below 400                                                                                                                                                          | `every generated HTML artifact is reachable, including the 404 document`                                               |
| The restrictive CSP disables an intended browser interaction                        | The theme control continues to work under the production CSP                                   | The theme island hydrates, toggles the document theme, and emits no runtime errors                                                                                                                                           | `CSP does not break the interactive theme island`                                                                      |
| Internal project files leak into deployment output                                  | Sensitive files and directories stay unpublished                                               | Static audit checks the source and complete `dist/` artifact for forbidden sinks, files, directories, source maps, missing CSP, and third-party resource URLs; browser tests check representative sensitive paths return 404 | `npm run security:audit`; `common sensitive project paths are not publicly exposed`                                    |

These tests guarantee properties of the generated artifact and browser behavior exercised by
Playwright against the local production preview. They do not prove the deployed GitHub Pages
response is identical, inspect HTTP response headers that GitHub Pages does not configure
here, exhaustively test every user interaction or browser, or establish that arbitrary
attacker-controlled input is safe. The query probe detects accidental reflection of that
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
