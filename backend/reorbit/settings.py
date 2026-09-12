from pathlib import Path
from datetime import timedelta
import os

from dotenv import load_dotenv

# Base directory.
BASE_DIR = Path(__file__).resolve().parent.parent


# Load environment variables.
load_dotenv(BASE_DIR / ".env", override=True)


# Security settings.
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "dev-only-change-me",
)

DEBUG = (
    os.getenv(
        "DEBUG",
        "True",
    ).lower()
    == "true"
)

ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
]


# Installed applications.
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "apps.accounts",
    "apps.users",
    "apps.remakers",
    "apps.admins",
]


# Middleware configuration.
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# URL configuration.
ROOT_URLCONF = "reorbit.urls"


# Template configuration.
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# Server applications.
WSGI_APPLICATION = "reorbit.wsgi.application"
ASGI_APPLICATION = "reorbit.asgi.application"


# PostgreSQL database configuration.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv(
            "DB_NAME",
            "reorbit_db",
        ),
        "USER": os.getenv(
            "DB_USER",
            "postgres",
        ),
        "PASSWORD": os.getenv(
            "DB_PASSWORD",
            "",
        ),
        "HOST": os.getenv(
            "DB_HOST",
            "localhost",
        ),
        "PORT": os.getenv(
            "DB_PORT",
            "5432",
        ),
    }
}


# Internationalization settings.
LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


# Static and media files.
STATIC_URL = "static/"

STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"


# Default primary key.
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# CORS configuration.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:4028",
    "http://127.0.0.1:4028",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


# CSRF trusted origins.
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:4028",
    "http://127.0.0.1:4028",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


# Django REST Framework configuration.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.ReOrbitJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}


# JWT configuration.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=30,
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=7,
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# Email configuration.
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)

EMAIL_HOST = os.getenv(
    "EMAIL_HOST",
    "smtp.gmail.com",
)

EMAIL_PORT = int(
    os.getenv(
        "EMAIL_PORT",
        "587",
    )
)

EMAIL_USE_TLS = (
    os.getenv(
        "EMAIL_USE_TLS",
        "True",
    ).lower()
    == "true"
)

EMAIL_HOST_USER = os.getenv(
    "EMAIL_HOST_USER",
    "",
).strip()

EMAIL_HOST_PASSWORD = os.getenv(
    "EMAIL_HOST_PASSWORD",
    "",
).strip()

DEFAULT_FROM_EMAIL = f"ReOrbit <{EMAIL_HOST_USER}>"
