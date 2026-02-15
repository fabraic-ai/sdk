from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, MutableMapping, Optional
from urllib.parse import quote

import requests

DEFAULT_BASE_URL = "https://api.fabraic.co"
DEFAULT_SERVICE_VERSION = "v1"


class ServiceClient:
    def __init__(
        self,
        client: "FabraicClient",
        service_path: str,
        *,
        version: str = DEFAULT_SERVICE_VERSION,
    ) -> None:
        service_path = service_path.strip("/")
        if not service_path:
            raise ValueError("`service_path` must be a non-empty string")

        self._client = client
        self._service_path = service_path
        self._version = version or DEFAULT_SERVICE_VERSION

    def _build_path(self, path: str, path_params: Optional[Mapping[str, Any]]) -> str:
        clean_path = path if path.startswith("/") else f"/{path}"
        if path_params:
            for key, value in path_params.items():
                clean_path = clean_path.replace(f"{{{key}}}", quote(str(value), safe=""))

        return f"/{self._service_path}/{self._version}{clean_path}"

    def request(
        self,
        path: str,
        *,
        method: str = "GET",
        params: Optional[Mapping[str, Any]] = None,
        json: Optional[Any] = None,
        headers: Optional[Mapping[str, str]] = None,
        path_params: Optional[Mapping[str, Any]] = None,
    ) -> Any:
        full_path = self._build_path(path, path_params)
        return self._client.request(method, full_path, params=params, json=json, headers=headers)

    def get(self, path: str, **kwargs: Any) -> Any:
        return self.request(path, method="GET", **kwargs)

    def post(self, path: str, **kwargs: Any) -> Any:
        return self.request(path, method="POST", **kwargs)

    def put(self, path: str, **kwargs: Any) -> Any:
        return self.request(path, method="PUT", **kwargs)

    def patch(self, path: str, **kwargs: Any) -> Any:
        return self.request(path, method="PATCH", **kwargs)

    def delete(self, path: str, **kwargs: Any) -> Any:
        return self.request(path, method="DELETE", **kwargs)


@dataclass
class FabraicClient:
    api_key: Optional[str] = None
    access_token: Optional[str] = None
    base_url: str = DEFAULT_BASE_URL
    session: Optional[requests.Session] = None

    def __post_init__(self) -> None:
        if not self.api_key and not self.access_token:
            raise ValueError("Provide either `api_key` or `access_token`")

        self.base_url = self.base_url.rstrip("/")
        self.session = self.session or requests.Session()
        headers: MutableMapping[str, str] = {"Accept": "application/json"}

        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        else:
            headers["x-api-key"] = str(self.api_key)

        self.session.headers.update(headers)

    def request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Mapping[str, Any]] = None,
        json: Optional[Any] = None,
        headers: Optional[Mapping[str, str]] = None,
    ) -> Any:
        clean_path = path if path.startswith("/") else f"/{path}"
        url = f"{self.base_url}{clean_path}"

        request_headers: MutableMapping[str, str] = dict(self.session.headers)
        if headers:
            request_headers.update(headers)

        response = self.session.request(
            method.upper(),
            url,
            params=params,
            json=json,
            headers=request_headers,
        )
        response.raise_for_status()

        if not response.content:
            return None

        return response.json()

    def service(self, service_path: str, *, version: str = DEFAULT_SERVICE_VERSION) -> ServiceClient:
        return ServiceClient(self, service_path, version=version)
