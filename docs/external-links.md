# Secure External Links

## Goal

Writers can use ordinary Markdown links. The static build identifies outbound HTTPS links, shows the actual destination host, and applies the same security attributes consistently.

## Threat Model

The contract reduces tab-nabbing risk, prevents referrer disclosure on outbound navigation, and makes the linked destination visible before activation. It does not determine whether an external site is trustworthy or safe.

## Internal vs External

The build resolves each Markdown link against the configured Astro `site` URL. Relative links and absolute URLs with the same origin stay internal. `mailto:` and `tel:` links remain unchanged. HTTPS URLs on another origin are external. Protocol-relative URLs are resolved against the configured HTTPS site URL.

## HTTPS Policy

HTTP links fail the build with an authoring error. Update the destination to HTTPS only when the destination supports it; do not silently rewrite the URL.

## Dangerous Schemes

Only HTTPS web links and the `mailto:` / `tel:` special schemes are supported. `javascript:`, `data:`, `vbscript:`, `file:`, other unsupported schemes, malformed URLs, and URLs containing credentials fail the build.

## Destination Hostname

The displayed host is derived from the parsed `href` with the URL API. A non-default port is included in the visible host. Authors cannot provide a separate display domain that could disagree with the actual destination.

## HTML Contract

External links receive `target="_blank"`, `rel="noopener noreferrer external"`, and `referrerpolicy="no-referrer"`. The redundant `noreferrer` and `referrerpolicy` are intentional: the former is also a browser-compatible referrer safeguard, while the latter makes the privacy policy explicit in the link itself.

## Referrer Privacy

The link-level `no-referrer` policy prevents the current article URL from being sent to the destination. The site-wide referrer policy remains unchanged.

## Accessibility

The link retains its original Markdown text and keyboard behavior. A decorative `↗` and visible destination host are hidden from assistive technology to avoid duplicate reading; a visually hidden description announces the actual destination and that it opens in a new tab.

## Build-time Architecture

Astro's unified Markdown processor applies a custom rehype transformation to the generated HAST. It adds static HTML nodes and attributes before output; no browser-side link rewriting or third-party resource loading is introduced.

## Testing Strategy

Vitest covers URL classification and malformed/dangerous inputs. Playwright checks generated markup, keyboard activation, internal navigation, production security, accessibility, and deployed smoke behavior. Tests do not navigate to or request external destinations.

## Known Limitations

HTTPS and destination visibility do not guarantee that a destination is trustworthy, benign, or available. This feature is not a phishing or malware reputation service and does not check third-party availability.
