---
name: pyload
description: Interact with the pyLoad download manager API.
---

<!-- Tip: Use /create-skill in chat to generate content with agent assistance -->

Interact with the pyLoad download manager API to manage downloads, retrieve status, and handle errors effectively.

## API Interaction
 - Use references/api_specs.json for endpoint details and expected responses.

## Security Considerations

- **X-API-Key Header**: Use for all authenticated API requests
- **HTTPS**: Prefer HTTPS URLs; allow HTTP for localhost development
- **No Logging of Secrets**: Never log full API keys or URLs to console
- **Storage**: API keys stored in `chrome.storage.local` (user-only access)

## UI/UX Patterns

- Always disable interactive elements (buttons) while processing async operations
- Show loading states for long-running operations
- Use `showStatus()` helper for consistent error/success messaging
- All user-facing errors must be specific and actionable