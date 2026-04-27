---
description: "Use when writing code for the pyLoad-ng Firefox extension. Cover architecture, API interaction, security, and UI/UX patterns."
applyTo: ["**/*.js", "*.html"]
---

# pyLoad-ng Extension Guidelines
 - Always use semantic versioning
 - Always add comments and documentation to the code
 - Always increment version in manifest.json when making changes
 - Always increment version in update.json when making changes
 

## Extension Architecture

This is a WebExtensions (Manifest V3) browser extension with the following structure:

- **background.js**: Core business logic—API calls to pyLoad server, context menus, alarm listeners
- **popup.js/html**: User interface for monitoring downloads and server status
- **options.js/html**: Configuration interface for server URL and API key
- **style.css**: Responsive styling for popup and options UI

## Branch management
  - Always create a new branch when making changes to the codebase, even for small fixes. This helps maintain a clean commit history and allows for easier code reviews.
  - Always keep the **master** branch stable and ready for release. Use feature branches for development and merge back to main only after thorough testing.
  - Always create a new branch for each feature or bug fix, following the naming convention:
  - **master**: Stable releases
  - **develop**: Active development and integration
  - **feature/**: New features and experiments (e.g., `feature/new-ui`)
  - **bugfix/**: Bug fixes (e.g., `bugfix/api-error-handling`)


## Environment Variables
Environment variables are defined in the `.env` file and should be used for sensitive information such as API keys. The following variables are expected:
- `${AMO_JWT_ISSUER}`: The issuer for the JWT token used to authenticate with the AMO API.
- `${AMO_JWT_SECRET}`: The secret key for the JWT token used to authenticate with the AMO API.

## Build
- run `web-ext build --overwrite-dest` to build the extension for distribution (creates a .zip file)
- run `web-ext sign --channel=unlisted --api-key={AMO_JWT_ISSUER} --api-secret=${AMO_JWT_SECRET}` to sign and upload the extension
