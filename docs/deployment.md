# Deployment Architecture

## Goals

Build the same static application for a domain root or a path prefix by changing only build
inputs. Application code does not branch on GitHub Pages, Cloudflare Pages, repository names,
or provider hostnames. GitHub Pages remains the current production host.

## Build Inputs

- `SITE_URL` is an absolute HTTP(S) public site URL: the origin plus the optional deployment
  path, with no credentials, query, or fragment. A trailing slash is normalized.
- `SITE_BASE` is `/` for a root deployment or an absolute path prefix such as `/ikesama.dev`.
  It may have one trailing slash; generated configuration normalizes it to exactly one.
- `SITE_URL`'s path and `SITE_BASE` must describe the same deployment path. Values such as
  `ikesama.dev`, `//ikesama.dev`, duplicate slashes, dot segments, and mismatched paths fail
  validation.
- `PRODUCTION_URL` is required by the production smoke suite. It is an absolute public URL
  including the deployed base path, if any.

Production builds require both `SITE_URL` and `SITE_BASE`. Astro development defaults to
`http://localhost:4321/` and `/` when no values are provided.

## Local Development

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

`test:hosting` checks the existing root build, then builds and checks the subpath configuration.

## Root Hosting

Use `SITE_URL=https://example.test` and `SITE_BASE=/`. Generated routes, canonicals, RSS,
sitemap entries, and root-relative assets resolve from `/`.

## GitHub Pages

GitHub Pages remains the current production deployment. Its workflow supplies
`SITE_URL=https://bosatsuking.github.io/ikesama.dev` and `SITE_BASE=/ikesama.dev`. These
provider-specific values are kept in `.github/workflows/deploy.yml`; the workflow builds and
deploys the exact SHA whose main-branch CI succeeded, then passes the deployed URL to
`PRODUCTION_URL` for read-only smoke tests.

## Future Hosting Provider

Cloudflare Pages is only a future migration candidate and is not configured or deployed in
this phase. A root deployment there would supply its own public `SITE_URL` and `SITE_BASE=/`
to the same Astro build. No provider discriminator, provider-specific application branch,
workflow, credential, or account setup is part of this design.

## Production Smoke

Set `PRODUCTION_URL` to the deployed site root, including the path prefix where applicable,
then run `npm run test:smoke`. The test suite derives its base path from this URL and checks
routes, assets, canonical URLs, RSS, sitemap, CSP, navigation, theme interaction, and article
link contracts without leaving the deployed site. CI uses the same commit SHA for deployment
and smoke-test source.

## URL / Base Path Contract

`SITE_URL` identifies the public deployment prefix, and `SITE_BASE` is that prefix in path
form. The root pair is `https://example.test` and `/`; the subpath pair is
`https://example.test/ikesama.dev` and `/ikesama.dev`. The Astro `site` and `base` settings
are both derived from these inputs. Canonical URLs, sitemap and RSS links use the public URL;
navigation, assets, favicon, theme initialization, and internal links use the base path.

The artifact contract verifies expected static routes, canonical URLs, assets, sitemap, and
RSS for both root and subpath builds. Secure External Links classifies current-site absolute
URLs by the configured site's origin and does not hard-code any production hostname.

## Migration Strategy

1. Keep GitHub Pages as production while a candidate provider is configured separately.
2. Build and smoke-test the candidate using its own `SITE_URL`, `SITE_BASE`, and
   `PRODUCTION_URL`.
3. Compare the deployed routes, assets, canonical URLs, sitemap, RSS, security policy, and
   browser behavior before considering a production cutover.
4. Make any repository rename or custom-domain change as a separate, reviewed operation after
   updating the deployment inputs and confirming external links and redirects.

## Known Constraints

- Cloudflare Pages has not been introduced; GitHub Pages is current production.
- No custom domain has been selected.
- The GitHub Pages repository subpath remains a deployment input, not an application identity.
- A hosting provider still needs to serve the generated static files and support the site's
  expected clean-route behavior and `404.html` fallback.
