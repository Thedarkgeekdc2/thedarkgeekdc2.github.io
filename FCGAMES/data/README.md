# Question Data

Phase 4 uses `manifest.json` as the content catalog.

Each topic file contains:
- `class`
- `subject`
- `topic`
- `questions`

Each question contains at least:
- `id`
- `type`
- type-specific fields such as `options`, `answer`, `image`, `pairs`, or `items`

Adding a topic JSON file is designed to become automatic once it is registered in the catalog. The Admin Question Builder in a later phase will handle that registration for you.
