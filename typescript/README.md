# fabraic TypeScript SDK

## Install

```bash
npm install @fabraic/sdk-typescript
```

## Usage

```ts
import { FabraicClient } from '@fabraic/sdk-typescript'

const client = new FabraicClient({
  apiKey: process.env.FABRAIC_API_KEY,
})

const system = client.service('system', 'v1')
const workspaces = await system.get('/workspaces', { query: { limit: 25 } })
```
