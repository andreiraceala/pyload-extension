# Agent Instructions for pyLoad-extension

This repository contains a browser extension for interacting with a [pyLoad-ng](https://github.com/pyload/pyload) server.

## Getting Started

### Development
- **Testing**: Load the extension temporarily in Firefox via `about:debugging#/runtime/this-firefox` and select `manifest.json`.
- **Browser Compatibility**: Specify supported browsers and minimum versions. If targeting Firefox, verify Manifest V3 API compatibility and include fallback code or polyfills for APIs unsupported by Firefox.
- **Requirements**: Requires a running `pyLoad-ng` instance. Configure the extension via the Options page with (1) the pyLoad-ng base URL including scheme and port (e.g. https://example.com:8000), and (2) the API key string. The extension will call the server at <BASE_URL>/api/... and send the API key in the 'X-API-Key' request header. If the extension cannot reach the server or authentication fails, show an explicit error message and a 'test connection' button; do not persist invalid credentials. If the server returns 401 or 403, display 'Authentication failed: verify server URL and API key', do not save the key, and offer a 'Test connection' button that retries once after user confirmation.

## 🛠️ Project Structure

- `manifest.json`: Manifest V3 configuration.
- `background.js`: API interaction, context menus, and storage management.
- `popup.html` / `popup.js`: Monitoring interface.
- `options.html` / `options.js`: Configuration management.

## Best Practices

- **Security**: The extension communicates directly with the server. Use HTTPS for the pyLoad server to secure credentials. Document required CORS headers and that the pyLoad server must serve over HTTPS to avoid mixed-content blocking; provide example server CORS configuration.
- **Environment**: Define AMO_JWT_ISSUER and AMO_JWT_SECRET in the project .env file (AMO_JWT_ISSUER=<issuer-id>, AMO_JWT_SECRET=<64-char hex secret>). If both .env and Pyload-extension.code-workspace define them, .env takes precedence. Do not commit .env to source control.
- **Packaging**: Before packaging, verify ./scripts/package.sh exists and is executable. Run ./scripts/package.sh --sign to create a signed XPI; if ./scripts/package.sh is missing, follow BUILD.md for manual packaging steps or use 'web-ext sign' as documented. If package.sh is missing or not executable, abort packaging and display 'package.sh not found or not executable; check scripts/ or follow BUILD.md for manual signing steps.'

## Known Gotchas
- Firefox extensions require signing via [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/) for persistence.
- `README.md` and `BUILD.md` instructions may reference `package.sh` which might be missing; verify project state before relying on build scripts.
