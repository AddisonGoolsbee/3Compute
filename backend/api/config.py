from pathlib import Path

from pydantic_settings import BaseSettings

_env_path = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    google_client_id: str = "test-client-id"
    google_client_secret: str = "test-client-secret"
    redirect_uri_dev: str = "http://127.0.0.1:5555/api/auth/callback"
    redirect_uri_prod: str = ""
    frontend_origin_dev: str = "http://127.0.0.1:5173"
    frontend_origin_prod: str = ""
    flask_env: str = "development"
    flask_secret: str = "change-me-in-production"
    port_base: int = 10000
    database_url: str = "sqlite:///backend/csroom.db"
    max_users: int = 20
    memory_mb: int = 16384
    cf_api_token: str = ""
    caddy_admin_url: str = "http://localhost:2019"
    app_domain: str = "app.csroom.org"

    # Cloudflare Turnstile (https://developers.cloudflare.com/turnstile/).
    # Defaults are Cloudflare's documented test keys: site key always renders
    # an invisible widget that auto-passes, secret always validates "true".
    # Swap to real keys via env once a Turnstile widget is created.
    turnstile_site_key: str = "1x00000000000000000000AA"
    turnstile_secret_key: str = "1x0000000000000000000000000000000AA"

    # Webhook URL receiving "request access" form notifications. Empty = no-op.
    discord_webhook_url: str = ""

    @property
    def is_production(self) -> bool:
        return self.flask_env == "production"

    @property
    def redirect_uri(self) -> str:
        return self.redirect_uri_prod if self.is_production else self.redirect_uri_dev

    @property
    def frontend_origin(self) -> str:
        return self.frontend_origin_prod if self.is_production else self.frontend_origin_dev

    class Config:
        env_file = str(_env_path)
        extra = "ignore"
