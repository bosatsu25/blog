# Deployment Architecture

## Goals

Publish one static Astro artifact to GitHub Pages with no paid runtime service and no repository-name-specific application code.

GitHub Pages is the production host. There is no Cloudflare Pages, external CMS, database, worker, API server, or provider abstraction to operate.

## Repository setting

Repository Settings → Pages → Build and deployment must use:

```text
Source: GitHub Actions
```

This is a one-time repository setting. Branch/Jekyll publishing must not be enabled for this Astro repository, because it would create a second Pages build path and attempt to process Astro source as Jekyll content.

## Build inputs

- `SITE_URL` is an absolute HTTP(S) public site URL: origin plus optional deployment path.
- `SITE_BASE` is `/` for a root deployment or an absolute path prefix such as `/project-site`.
- `SITE_URL`'s path and `SITE_BASE` must describe the same deployment path.
- `PRODUCTION_URL` is required by the read-only production smoke suite.

Production builds require both `SITE_URL` and `SITE_BASE`. Astro development defaults to `http://localhost:4321/` and `/` when no values are provided.

## Local development

```powershell
$env:SITE_URL = 'http://localhost:4321'
$env:SITE_BASE = '/'
npm run dev
```

For a root production-shaped build and the two-shape artifact contract:

```powershell
$env:SITE_URL = 'https://example.test'
$env:SITE_BASE = '/'
npm run build
npm run test:hosting
```

`test:hosting` validates the existing root artifact, then rebuilds once with the generic `/project-site` prefix and validates the subpath artifact. The test value is deliberately unrelated to the repository name.

## GitHub Pages workflow

`.github/workflows/site.yml` owns CI and deployment.

On a successful `main` CI gate:

1. `actions/configure-pages` reads the effective Pages configuration.
2. Its `base_url` becomes `SITE_URL`.
3. Its `base_path` becomes `SITE_BASE`; an empty base path is normalized to `/`.
4. Astro builds the production artifact.
5. `actions/upload-pages-artifact` uploads `dist/`.
6. `actions/deploy-pages` publishes that artifact.
7. The returned production URL is passed to the read-only smoke suite.

The workflow therefore does not calculate `https://OWNER.github.io/REPOSITORY` itself. Repository renames and a future custom domain do not require URL constants in application code.

## Production smoke

Set `PRODUCTION_URL` to the deployed site root, including the path prefix where applicable, then run:

```bash
npm run test:smoke
```

The suite verifies core routes, a dynamically discovered published article, assets, canonical URLs, RSS, sitemap, CSP, navigation, theme interaction, and the custom 404 response.

The suite does not depend on a specific article filename or title.

## URL / base-path contract

The root pair is:

```text
SITE_URL=https://example.test
SITE_BASE=/
```

The generic subpath pair used by the hosting contract is:

```text
SITE_URL=https://example.test/project-site
SITE_BASE=/project-site
```

Canonical URLs, sitemap and RSS links use the public URL. Navigation, assets, favicon, theme initialization, and internal links use the normalized base path.

## Cost boundary

The deployment architecture intentionally requires no application runtime after build. The public repository, GitHub Actions workflow, and GitHub Pages static hosting are the only hosting-side components.

A separately purchased custom domain, if added later, is outside this zero-runtime-cost architecture.
