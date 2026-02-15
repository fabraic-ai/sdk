# fabraic Rust SDK

## Add dependency

```toml
[dependencies]
fabraic-sdk = "0.1.0"
```

## Usage

```rust
use fabraic_sdk::FabraicClient;

let client = FabraicClient::new(Some("YOUR_API_KEY"), None, None)?;
let _system = client.service("system", Some("v1"))?;
```
