# Architecture

## Goal

Build a quiet personal blog for sharing reflections on Buddhism, daily life, and technology while keeping the site fast, understandable, zero-cost to host, and cheap to maintain.

## Principles

1. **Static by default** — pages and articles render to HTML at build time.
2. **Hydrate by exception** — React is reserved for stateful UI, not used as the page shell.
3. **Typed content** — article frontmatter is validated by Astro Content Collections + Zod.
4. **Draft by default** — new content remains unpublished until the publish command explicitly changes its state.
5. **Authoring hides mechanics** — filename generation, frontmatter creation, targeted Git commit, and push are local tooling responsibilities.
6. **Automated quality gates** — mechanically verifiable quality belongs in CI.
7. **Change-aware verification** — article-only changes use a smaller safe gate; code/config changes use the full browser gate.
8. **Hosting-neutral application code** — application code consumes only `SITE_URL` and `SITE_BASE`.
9. **Article content protection is scoped** — browser interaction deterrents apply only to article bodies.
10. **External links are secured at build time** — Markdown links are classified and decorated from their destination URL.
11. **Archive is generated at build time** — one validated category per article is grouped by UTC year and month.
12. **No runtime CMS** — there is no database, authentication service, API server, or hosted CMS to operate.

## Authoring boundary

```text
Human
  |
  +--> npm run post:new
  |      |
  |      +--> YYMMDD-HHmm(.md)
  |      +--> publishedAt in Asia/Tokyo
  |      +--> validated category choice
  |      +--> draft: true
  |
  +--> edit Markdown body
  |
  +--> npm run post:publish
         |
         +--> draft: false
         +--> verify:content
         +--> git add only the article
         +--> git commit only the article
         +--> git push
```

Markdown remains the source of truth. Git remains version control, but day-to-day article creation does not require manually choosing a filename, writing boilerplate frontmatter, or typing Git commands.

## Runtime boundary

```text
Build time
  Markdown
     +
  Astro components
     +
  category/year/month archive
     |
     v
  Static HTML/CSS  ----------------------+
                                           |
Browser                                    |
React island: ThemeToggle                  |
Article body: selection/copy deterrents    |
     |                                     |
     +------------- selective hydration ---+
```

Article pages add local interaction deterrents for selection, copying, cutting, context menus, dragging, and print output, plus a repeated visual watermark. These controls apply only to `.article-body`; they do not make publicly served content confidential or prevent retrieval through developer tools, source inspection, direct HTTP requests, OCR, screenshots, recordings, or external cameras.

Article categories are constrained by the content schema. The Archive groups published articles by category, UTC year, and month during static generation; no client-side filter or runtime collection request is required. `/writing/` remains as a compatibility page pointing readers to `/archive/`.

The original user-provided lotus image is retained at `design/lotus-source.png`; optimized resized copies are used for the brand mark, favicon, and Apple touch icon. The source image is not copied into the public artifact.

Markdown article links pass through a build-time rehype transformation that validates URL schemes and adds the external-link contract without client-side JavaScript. See [docs/external-links.md](./docs/external-links.md).

## CI boundary

`.github/workflows/site.yml` owns both verification and production deployment.

Article-only changes under `src/content/writing/**/*.md` run formatting, schema/build validation, and static security audit. Code/config changes run formatting, linting, unit tests, hosting-contract builds, static security audit, performance budget, multi-browser E2E, browser security, and accessibility tests.

The final check remains named **CI gate** so branch rules can require one stable check.

Dependency vulnerability discovery is asynchronous to article publication. `.github/workflows/security.yml` runs `npm audit --audit-level=high` weekly and on demand, while Dependabot remains responsible for update PR discovery.

Tests discover generated article routes rather than hard-coding individual article IDs. Removing or replacing an article therefore does not require updating unrelated quality tests.

## Hosting boundary

GitHub Pages is the only production hosting provider. The Pages workflow obtains the effective public `base_url` and `base_path` from `actions/configure-pages`, then feeds those values into the same Astro build contract used locally.

Application code does not derive URLs from repository names and does not contain a provider switch. Root and generic subpath artifacts are checked by `npm run test:hosting`. See [docs/deployment.md](./docs/deployment.md).

## Why not a full React SPA?

The site is content-heavy and interaction-light. A full SPA would move routing and rendering work to the browser without a product requirement that justifies it. Astro keeps the document readable before hydration and lets interactive components opt into JavaScript explicitly.

## Why not a CMS?

The current product requirement is single-author Markdown publishing. A hosted CMS would add authentication, persistence, deployment, and operational dependencies without removing the need for the static build pipeline.

The local authoring commands solve the actual friction while preserving Markdown portability and zero hosting cost.

## Verification

Code/config changes are expected to pass:

```text
format/lint/unit
  -> Astro check + build
  -> root/subpath hosting contract
  -> static security/performance
  -> Chromium/Firefox/WebKit E2E
  -> browser security/accessibility
  -> CI gate
```

Article-only changes use:

```text
Markdown formatting
  -> Astro check + build
  -> static security audit
  -> CI gate
```

A successful `main` CI gate proceeds directly to the GitHub Pages production build and a read-only production smoke suite.
