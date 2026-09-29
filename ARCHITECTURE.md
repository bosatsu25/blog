# Architecture

## Goal

Build a content-first personal engineering site that remains fast and understandable while still demonstrating current frontend engineering practices.

## Principles

1. **Static by default** — pages and articles render to HTML at build time.
2. **Hydrate by exception** — React is reserved for stateful UI, not used as the page shell.
3. **Typed content** — article frontmatter is validated by Astro Content Collections + Zod.
4. **Automated quality gates** — formatting, linting, type checking, unit tests, build, and E2E are CI responsibilities.
5. **Hosting-neutral output** — application code consumes only the build-time `SITE_URL` and `SITE_BASE`; it does not branch on a hosting provider.
6. **Article content protection is scoped** — browser interaction deterrents apply only to article bodies and do not alter the shared site shell.
7. **External links are secured at build time** — Markdown links are classified and decorated
   from their actual destination URL.

## Runtime boundary

```text
Build time
  Markdown
     +
  Astro components
     |
     v
  Static HTML/CSS  ----------------------+
                                           |
Browser                                    |
  React island: ThemeToggle                |
  React island: ProjectFilter              |
  Article body: selection/copy deterrents  |
     |                                     |
     +------------- selective hydration ---+
```

Article pages add local interaction deterrents for selection, copying, cutting, context menus, dragging, and print output, plus a repeated visual watermark. These controls apply only to `.article-body`; they do not make publicly served content confidential or prevent retrieval through developer tools, source inspection, direct HTTP requests, OCR, screenshots, recordings, or external cameras.

Markdown article links pass through a build-time rehype transformation that validates URL
schemes and adds the external-link contract without client-side JavaScript. See
[docs/external-links.md](./docs/external-links.md).

## Hosting boundary

The application builds a static artifact from `SITE_URL` and `SITE_BASE`. Provider-specific
public URLs and deployment steps belong in workflow configuration, not application code.
The current production provider is GitHub Pages; no alternate provider is configured.
Root and subpath artifacts are checked by `npm run test:hosting`. See
[docs/deployment.md](./docs/deployment.md) for the URL contract and migration boundary.

## Why not a full React SPA?

The site is content-heavy and interaction-light. A full SPA would move routing and rendering work to the browser without a product requirement that justifies it. Astro keeps the document readable before hydration and lets interactive components opt into JavaScript explicitly.

## Verification

Pull requests are expected to pass:

```text
format/lint/typecheck/unit
  -> build/static security audit
  -> E2E/security/accessibility
  -> performance budget/npm audit
```

GitHub Pages deployment is triggered only by a successful CI run for a push to `main`. The deploy workflow checks out the exact tested commit, then runs a read-only production smoke suite against the deployed URL.
