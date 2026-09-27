"""Thin HTTP client for the SmartSplitAI Express API.

Every non-2xx is converted into a SmartSplitError carrying the `{ message }`
string that backend/middleware/errorMiddleware.js produces, so tool failures
read like the application's own validation messages rather than raw HTTP noise.
"""

from typing import Any

import httpx
from mcp.server.mcpserver.exceptions import ToolError

from . import config


class SmartSplitError(ToolError):
    """An error the model can act on: the API's own message, plus status.

    Subclasses MCP's ToolError so it is reported as a clean tool failure with
    this message, rather than being wrapped as an unexpected crash.
    """

    def __init__(self, status: int, message: str) -> None:
        self.status = status
        self.message = message
        super().__init__(message if status == 0 else f"{message} (HTTP {status})")


def _extract_message(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        text = (response.text or "").strip()
        return text[:300] or f"Request failed with status {response.status_code}"
    if isinstance(body, dict):
        message = body.get("message")
        if isinstance(message, str) and message:
            return message
    return f"Request failed with status {response.status_code}"


class ApiClient:
    def __init__(self) -> None:
        self._client = httpx.Client(
            base_url=config.API_BASE_URL,
            timeout=config.REQUEST_TIMEOUT,
        )

    def request(
        self,
        method: str,
        path: str,
        *,
        json: Any | None = None,
        token: str | None = None,
    ) -> Any:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        try:
            response = self._client.request(method, path, json=json, headers=headers)
        except httpx.RequestError as exc:
            raise SmartSplitError(
                0,
                f"Cannot reach the SmartSplitAI API at {config.API_BASE_URL}. "
                f"Is the backend running? ({exc.__class__.__name__})",
            ) from exc

        if response.status_code >= 400:
            raise SmartSplitError(response.status_code, _extract_message(response))

        if not response.content:
            return {}
        try:
            return response.json()
        except ValueError:
            return {"raw": response.text}

    def get(self, path: str, **kw: Any) -> Any:
        return self.request("GET", path, **kw)

    def post(self, path: str, **kw: Any) -> Any:
        return self.request("POST", path, **kw)

    def put(self, path: str, **kw: Any) -> Any:
        return self.request("PUT", path, **kw)

    def delete(self, path: str, **kw: Any) -> Any:
        return self.request("DELETE", path, **kw)


client = ApiClient()
