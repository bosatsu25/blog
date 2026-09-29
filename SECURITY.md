# Security Policy

This project is a static-first personal site published via GitHub Pages. The security model is intentionally strict: we treat browser security, generated artifact integrity, and production deployment checks as first-class software quality requirements.

## Security scope

This policy covers:

- the static site generated in the repository
- Astro production output and generated HTML artifacts
- local/CI security verification for the public site
- GitHub Pages deployment assumptions relevant to this project

This policy does not cover:

- GitHub account access controls
- repository permissions outside the project configuration
- external service providers not used by this site

## Supported versions

This project does not maintain a multi-version product line. Security updates are handled for the current default branch and the most recently released production build of the site.

| Version / branch        | Supported                                    |
| ----------------------- | -------------------------------------------- |
| main                    | Yes                                          |
| release branches / tags | Limited to active production deployment only |
| unpublished local work  | Not applicable                               |

## Security contract

The public site must maintain the following contract:

- Content Security Policy is enforced in generated pages.
- `default-src 'none'` is the baseline, with a narrow allowlist for images, fonts, and the site’s own scripts/styles.
- No `unsafe-inline` or `unsafe-eval` sources are allowed.
- No wildcard origins, third-party executable resources, or external script/style origins are permitted.
- No project source files, environment files, package metadata, `.git` content, or source maps are published.
- No raw HTML injection sinks are added without an explicit architecture change and test update.
- Referrer policy is set to `no-referrer` for public pages.

## Reporting a vulnerability

Please report security issues privately through GitHub Security Advisories for this repository, or contact the maintainer through the repository’s verified contact path if it is available.

When reporting, include:

- the affected route or artifact, if known
- reproduction steps
- impact assessment
- any proof of concept or exploit details that are safe to share
- your preferred contact method for follow-up

We aim to acknowledge reports promptly and provide a status update as remediation proceeds.

## Security testing in this repo

The project enforces security through automation:

- `npm run security:audit` checks source and generated `dist/` content for forbidden patterns and sensitive files.
- `npm run test:security` validates the production artifact and preview server under a strict CSP contract.
- GitHub Actions runs the security gate before deployment.

See [docs/security-testing.md](./docs/security-testing.md) for the current security model and test coverage.
