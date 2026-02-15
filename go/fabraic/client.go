package fabraic

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
)

const (
	DefaultBaseURL       = "https://api.fabraic.co"
	DefaultServiceVersion = "v1"
)

type Client struct {
	baseURL      *url.URL
	httpClient   *http.Client
	defaultHeads http.Header
}

type Config struct {
	APIKey       string
	AccessToken  string
	BaseURL      string
	HTTPClient   *http.Client
}

type ServiceClient struct {
	client      *Client
	servicePath string
	version     string
}

func NewClient(cfg Config) (*Client, error) {
	if cfg.APIKey == "" && cfg.AccessToken == "" {
		return nil, fmt.Errorf("provide either APIKey or AccessToken")
	}

	base := strings.TrimRight(cfg.BaseURL, "/")
	if base == "" {
		base = DefaultBaseURL
	}

	parsed, err := url.Parse(base)
	if err != nil {
		return nil, fmt.Errorf("parse base url: %w", err)
	}

	h := make(http.Header)
	h.Set("Accept", "application/json")
	if cfg.AccessToken != "" {
		h.Set("Authorization", "Bearer "+cfg.AccessToken)
	} else {
		h.Set("x-api-key", cfg.APIKey)
	}

	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	return &Client{
		baseURL:      parsed,
		httpClient:   httpClient,
		defaultHeads: h,
	}, nil
}

func (c *Client) Service(servicePath, version string) (*ServiceClient, error) {
	clean := strings.Trim(servicePath, "/")
	if clean == "" {
		return nil, fmt.Errorf("servicePath must be non-empty")
	}
	if version == "" {
		version = DefaultServiceVersion
	}

	return &ServiceClient{client: c, servicePath: clean, version: version}, nil
}

func (c *Client) Request(method, rawPath string, query map[string]string, body any, headers map[string]string) (any, error) {
	cleanPath := rawPath
	if !strings.HasPrefix(cleanPath, "/") {
		cleanPath = "/" + cleanPath
	}

	target := *c.baseURL
	target.Path = path.Join(c.baseURL.Path, cleanPath)

	q := target.Query()
	for k, v := range query {
		q.Set(k, v)
	}
	target.RawQuery = q.Encode()

	var payload io.Reader
	mergedHeaders := c.defaultHeads.Clone()

	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal body: %w", err)
		}
		payload = bytes.NewBuffer(encoded)
		mergedHeaders.Set("Content-Type", "application/json")
	}

	for k, v := range headers {
		mergedHeaders.Set(k, v)
	}

	req, err := http.NewRequest(method, target.String(), payload)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header = mergedHeaders

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		data, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("request failed (%d): %s", resp.StatusCode, string(data))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if len(bytes.TrimSpace(data)) == 0 {
		return nil, nil
	}

	var out any
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return out, nil
}

func (s *ServiceClient) Request(method, rawPath string, pathParams map[string]string, query map[string]string, body any, headers map[string]string) (any, error) {
	cleanPath := rawPath
	if !strings.HasPrefix(cleanPath, "/") {
		cleanPath = "/" + cleanPath
	}

	for key, value := range pathParams {
		cleanPath = strings.ReplaceAll(cleanPath, "{"+key+"}", url.PathEscape(value))
	}

	fullPath := "/" + strings.Trim(s.servicePath, "/") + "/" + strings.Trim(s.version, "/") + cleanPath
	return s.client.Request(method, fullPath, query, body, headers)
}
