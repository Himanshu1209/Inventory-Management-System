import os
from functools import lru_cache


class Settings:
    def __init__(self):
        self.app_name = os.getenv("APP_NAME", "Inventory Management API")
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./inventory_dev.db")
        self.cors_origins = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,https://bountiful-trust-production-38b8.up.railway.app").split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings():
    return Settings()
