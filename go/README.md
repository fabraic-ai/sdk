# fabraic Go SDK

## Install

```bash
go get github.com/fabraic/fabraic-sdk/go
```

## Usage

```go
client, err := fabraic.NewClient(fabraic.Config{APIKey: "YOUR_API_KEY"})
if err != nil {
    panic(err)
}

system, err := client.Service("system", "v1")
if err != nil {
    panic(err)
}

workspaces, err := system.Request("GET", "/workspaces", nil, map[string]string{"limit": "25"}, nil, nil)
_ = workspaces
```
