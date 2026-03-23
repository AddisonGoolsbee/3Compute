"""Manages *.app.3compute.org routing via the Caddy Admin API.

Routes are stored in Caddy's persistent config — they survive Caddy restarts
without any file writes or sudo. TLS for the wildcard cert is handled by
Caddy's ACME client using the Cloudflare DNS-01 challenge.
"""

import logging
import re

import httpx

from .config import Settings

logger = logging.getLogger("subdomain_caddy")

_settings = Settings()
CADDY_ADMIN = _settings.caddy_admin_url
APP_DOMAIN = _settings.app_domain
CF_API_TOKEN = _settings.cf_api_token
APP_SERVER = "srv0"  # Caddy server block that owns :443 (created by Caddyfile)

RESERVED = frozenset({
    "www", "api", "app", "admin", "mail", "ftp", "ssh",
    "test", "dev", "staging", "static", "cdn", "assets",
    "jdoe", "my-app"
})

_SUBDOMAIN_RE = re.compile(r"^[a-z0-9][a-z0-9\-]{1,30}[a-z0-9]$")


def is_valid_subdomain(s: str) -> bool:
    return bool(_SUBDOMAIN_RE.match(s))


# ---------------------------------------------------------------------------
# Route builders
# ---------------------------------------------------------------------------

def _make_route(subdomain: str, port: int) -> dict:
    return {
        "@id": f"app-{subdomain}",
        "match": [{"host": [f"{subdomain}.{APP_DOMAIN}"]}],
        "handle": [{
            "handler": "reverse_proxy",
            "upstreams": [{"dial": f"localhost:{port}"}],
            "headers": {
                "request": {
                    "set": {
                        "X-Forwarded-Proto": ["{http.request.scheme}"],
                        "X-Real-IP": ["{http.request.remote.host}"],
                        "X-Forwarded-For": ["{http.request.remote.host}"],
                    }
                }
            },
            "transport": {
                "protocol": "http",
                "read_timeout": "300s",
                "write_timeout": "300s",
            },
            "flush_interval": -1,
        }],
        "terminal": True,
    }


def _catchall_route() -> dict:
    return {
        "@id": "app-catchall",
        "match": [{"host": [f"*.{APP_DOMAIN}"]}],
        "handle": [{
            "handler": "static_response",
            "status_code": 404,
            "body": "No app is running at this address.\n",
        }],
        "terminal": True,
    }


# ---------------------------------------------------------------------------
# TLS automation
# ---------------------------------------------------------------------------

def _ensure_tls_policy(client: httpx.Client) -> None:
    """Add a DNS-01 wildcard TLS policy for APP_DOMAIN if not already present."""
    if not CF_API_TOKEN:
        logger.warning("CF_API_TOKEN not set — wildcard TLS automation skipped")
        return

    wildcard = f"*.{APP_DOMAIN}"
    policy = {
        "subjects": [wildcard],
        "issuers": [{
            "module": "acme",
            "challenges": {
                "dns": {
                    "provider": {
                        "name": "cloudflare",
                        "api_token": CF_API_TOKEN,
                    }
                }
            },
        }],
    }

    resp = client.get(f"{CADDY_ADMIN}/config/apps/tls/automation/policies")
    if resp.is_success and resp.text.strip() not in ("null", ""):
        policies = resp.json()
        if isinstance(policies, list):
            if any(wildcard in p.get("subjects", []) for p in policies):
                return  # already configured
            client.post(
                f"{CADDY_ADMIN}/config/apps/tls/automation/policies",
                json=policy,
            )
        else:
            client.put(
                f"{CADDY_ADMIN}/config/apps/tls/automation",
                json={"policies": [policy]},
            )
    else:
        client.put(
            f"{CADDY_ADMIN}/config/apps/tls/automation",
            json={"policies": [policy]},
        )
    logger.info("Configured wildcard TLS automation for %s via Cloudflare DNS", wildcard)


# ---------------------------------------------------------------------------
# Route array helpers (GET then PUT to preserve ordering)
# ---------------------------------------------------------------------------

def _get_routes(client: httpx.Client) -> list:
    resp = client.get(f"{CADDY_ADMIN}/config/apps/http/servers/{APP_SERVER}/routes")
    if resp.is_success and resp.text.strip() not in ("null", ""):
        data = resp.json()
        return data if isinstance(data, list) else []
    return []


def _put_routes(client: httpx.Client, routes: list) -> None:
    resp = client.patch(
        f"{CADDY_ADMIN}/config/apps/http/servers/{APP_SERVER}/routes",
        json=routes,
    )
    if resp.status_code == 404:
        # Routes key doesn't exist yet — use PUT to create it
        resp = client.put(
            f"{CADDY_ADMIN}/config/apps/http/servers/{APP_SERVER}/routes",
            json=routes,
        )
    resp.raise_for_status()



# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def ensure_app_server() -> None:
    """Ensure the catchall route exists in the Caddy server that owns :443.

    The server itself (srv0) and its TLS config are managed by the Caddyfile.
    This function only ensures the *.app.3compute.org catchall route is present.
    """
    try:
        with httpx.Client(timeout=10.0) as client:
            _ensure_tls_policy(client)
            routes = _get_routes(client)
            if any(r.get("@id") == "app-catchall" for r in routes):
                logger.info("Caddy app server already initialised")
                return
            routes = [r for r in routes if r.get("@id") != "app-catchall"]
            routes.append(_catchall_route())
            _put_routes(client, routes)
            logger.info("Added catchall route for %s to Caddy", APP_DOMAIN)
    except Exception as exc:
        logger.warning("Could not initialise Caddy app server (Caddy running?): %s", exc)


def add_subdomain(subdomain: str, port: int) -> None:
    with httpx.Client(timeout=10.0) as client:
        routes = _get_routes(client)
        # Drop old entry for same subdomain or catch-all (we re-append it at the end)
        routes = [
            r for r in routes
            if r.get("@id") not in (f"app-{subdomain}", "app-catchall")
        ]
        routes.append(_make_route(subdomain, port))
        routes.append(_catchall_route())  # must stay last
        _put_routes(client, routes)
    logger.info("Caddy: %s.%s → localhost:%d", subdomain, APP_DOMAIN, port)


def remove_subdomain(subdomain: str) -> None:
    with httpx.Client(timeout=10.0) as client:
        routes = _get_routes(client)
        routes = [r for r in routes if r.get("@id") != f"app-{subdomain}"]
        if not any(r.get("@id") == "app-catchall" for r in routes):
            routes.append(_catchall_route())
        _put_routes(client, routes)
    logger.info("Caddy: removed %s.%s", subdomain, APP_DOMAIN)
