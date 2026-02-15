# fabraic Python SDK

## Install

```bash
pip install fabraic-sdk
```

## Usage

```python
from fabraic_sdk import FabraicClient

client = FabraicClient(api_key="YOUR_API_KEY")
system = client.service("system", version="v1")
workspaces = system.get("/workspaces", params={"limit": 25})
```
