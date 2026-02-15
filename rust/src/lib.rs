use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, CONTENT_TYPE};
use reqwest::{Client as HttpClient, Method};
use serde_json::Value;
use std::collections::HashMap;
use url::Url;

const DEFAULT_BASE_URL: &str = "https://api.fabraic.co";
const DEFAULT_SERVICE_VERSION: &str = "v1";

pub struct FabraicClient {
    http: HttpClient,
    base_url: Url,
    default_headers: HeaderMap,
}

pub struct ServiceClient<'a> {
    client: &'a FabraicClient,
    service_path: String,
    version: String,
}

impl FabraicClient {
    pub fn new(
        api_key: Option<&str>,
        access_token: Option<&str>,
        base_url: Option<&str>,
    ) -> Result<Self, String> {
        if api_key.is_none() && access_token.is_none() {
            return Err("Provide either api_key or access_token".to_string());
        }

        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));

        if let Some(token) = access_token {
            let value = format!("Bearer {token}");
            let header = HeaderValue::from_str(&value).map_err(|e| e.to_string())?;
            headers.insert(AUTHORIZATION, header);
        } else if let Some(key) = api_key {
            let header = HeaderValue::from_str(key).map_err(|e| e.to_string())?;
            headers.insert("x-api-key", header);
        }

        let base = base_url.unwrap_or(DEFAULT_BASE_URL).trim_end_matches('/');
        let parsed = Url::parse(base).map_err(|e| e.to_string())?;

        Ok(Self {
            http: HttpClient::new(),
            base_url: parsed,
            default_headers: headers,
        })
    }

    pub fn service<'a>(&'a self, service_path: &str, version: Option<&str>) -> Result<ServiceClient<'a>, String> {
        let clean = service_path.trim_matches('/');
        if clean.is_empty() {
            return Err("service_path must be non-empty".to_string());
        }

        Ok(ServiceClient {
            client: self,
            service_path: clean.to_string(),
            version: version.unwrap_or(DEFAULT_SERVICE_VERSION).to_string(),
        })
    }

    pub async fn request(
        &self,
        method: Method,
        path: &str,
        query: Option<&HashMap<String, String>>,
        body: Option<Value>,
        headers: Option<HeaderMap>,
    ) -> Result<Value, reqwest::Error> {
        let clean_path = if path.starts_with('/') { path } else { &format!("/{path}") };
        let mut url = self.base_url.join(clean_path).expect("valid base/path combination");

        if let Some(params) = query {
            let mut pairs = url.query_pairs_mut();
            for (k, v) in params {
                pairs.append_pair(k, v);
            }
        }

        let mut request_headers = self.default_headers.clone();
        if let Some(custom_headers) = headers {
            for (name, value) in &custom_headers {
                request_headers.insert(name, value.clone());
            }
        }

        let mut request = self.http.request(method, url).headers(request_headers);

        if let Some(payload) = body {
            request = request.header(CONTENT_TYPE, "application/json").json(&payload);
        }

        let response = request.send().await?.error_for_status()?;
        let text = response.text().await?;
        if text.trim().is_empty() {
            return Ok(Value::Null);
        }

        Ok(serde_json::from_str(&text).unwrap_or(Value::Null))
    }
}

impl<'a> ServiceClient<'a> {
    fn build_path(&self, path: &str, path_params: Option<&HashMap<String, String>>) -> String {
        let mut clean_path = if path.starts_with('/') { path.to_string() } else { format!("/{path}") };

        if let Some(params) = path_params {
            for (k, v) in params {
                clean_path = clean_path.replace(&format!("{{{k}}}"), v);
            }
        }

        format!("/{}/{}/{}", self.service_path, self.version, clean_path.trim_start_matches('/'))
    }

    pub async fn request(
        &self,
        method: Method,
        path: &str,
        path_params: Option<&HashMap<String, String>>,
        query: Option<&HashMap<String, String>>,
        body: Option<Value>,
        headers: Option<HeaderMap>,
    ) -> Result<Value, reqwest::Error> {
        let full_path = self.build_path(path, path_params);
        self.client.request(method, &full_path, query, body, headers).await
    }
}
