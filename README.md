# fabraic SDK

Official multi-language SDK wrappers for the fabraic public APIs.

## Languages

- TypeScript: `typescript/`
- Python: `python/`
- PHP: `php/`
- Rust: `rust/`
- Go: `go/`

## Shared SDK Design

Each SDK follows the same model:

1. Initialize a client with either API key or access token.
2. Optionally set `baseUrl` (`https://api.fabraic.co` by default).
3. Create a service-scoped helper (`system`, `auth`, `data`, etc.).
4. Call endpoints with path params, query params, and JSON payloads.

## Authentication

All SDKs support:

- `x-api-key` for API key auth.
- `Authorization: Bearer <token>` for access token auth.

## Status

This repository is intentionally scaffolded for expansion. Public package publishing, CI, tests, and generated typed resources can be layered on top next.
