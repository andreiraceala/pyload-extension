---
description: "Use when writing code for the pyLoad-ng Firefox extension. Cover architecture, API interaction, security, and UI/UX patterns."
applyTo: ["**/*.js", "*.html"]
---

# pyLoad-ng Extension Guidelines

## Extension Architecture

This is a WebExtensions (Manifest V3) browser extension with the following structure:

- **background.js**: Core business logic—API calls to pyLoad server, context menus, alarm listeners
- **popup.js/html**: User interface for monitoring downloads and server status
- **options.js/html**: Configuration interface for server URL and API key
- **style.css**: Responsive styling for popup and options UI

