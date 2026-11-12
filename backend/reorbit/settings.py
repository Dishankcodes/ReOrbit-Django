
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse, unquote
import os

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv



# BASE CONFIGURATION


BASE_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env for local development.
# Real environment variables take priority over .env values.
load_dotenv(BASE_DIR / ".env", override=False)


def env_bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in {
        "1", "true", "yes", "on"
    }


def env_list(name, default=""):
    return [
        item.strip()
        for item in os.getenv(name, default).split(",")
        if item.strip()
    ]



# ENVIRONMENT / SECURITY


DEBUG = env_bool("DEBUG", False)

SECRET_KEY = os.getenv("SECRET_KEY", "").strip()

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-only-insecure-key-do-not-use-in-production"
    else:
        raise ImproperlyConfigured(
            "SECRET_KEY is not configured. Set it in backend/.env "
            "locally or as a Render environment variable."
        )


# Encrypts bank/UPI details in the database (see apps/core/crypto.py). Required unless DEBUG.
FIELD_ENCRYPTION_KEY = os.getenv("FIELD_ENCRYPTION_KEY", "").strip()
if not FIELD_ENCRYPTION_KEY and not DEBUG:
    raise ImproperlyConfigured(
        "FIELD_ENCRYPTION_KEY is not configured. Generate one with: "
        "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    )


ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    "127.0.0.1,localhost"
)



# INSTALLED APPLICATIONS


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

    # Shared foundation
    "apps.core",
    "apps.accounts",
    "apps.users",
    "apps.remakers",
    "apps.admins",

    # Domain A: marketplace money flow
    "apps.listings",
    "apps.portfolio",
    "apps.social",
    "apps.orders",
    "apps.payments",
    "apps.reviews",
    "apps.earnings",
    "apps.analytics",

    # Domain B: platform operations
    "apps.content",
    "apps.platform",
    "apps.notifications",
    "apps.support",
    "apps.complaints",
    "apps.donations",
    "apps.pickups",
    "apps.warehouse",
    "apps.rewards",
    "apps.messaging",
    "apps.adminops",
]



# MIDDLEWARE


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]



# URL / TEMPLATE CONFIGURATION


ROOT_URLCONF = "reorbit.urls"

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



# WSGI / ASGI


WSGI_APPLICATION = "reorbit.wsgi.application"
ASGI_APPLICATION = "reorbit.asgi.application"



# DATABASE CONFIGURATION
# Local: DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
# Production: DATABASE_URL (Neon PostgreSQL)


DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if DATABASE_URL:
    parsed_db = urlparse(DATABASE_URL)

    if parsed_db.scheme not in ("postgres", "postgresql"):
        raise ImproperlyConfigured(
            "DATABASE_URL must use postgres:// or postgresql://"
        )

    if not parsed_db.hostname or not parsed_db.path.strip("/"):
        raise ImproperlyConfigured(
            "DATABASE_URL is missing its database host or database name."
        )

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(parsed_db.path.lstrip("/")),
            "USER": unquote(parsed_db.username or ""),
            "PASSWORD": unquote(parsed_db.password or ""),
            "HOST": parsed_db.hostname,
            "PORT": parsed_db.port or "5432",
            "OPTIONS": {
                "sslmode": os.getenv(
                    "DB_SSLMODE",
                    "prefer" if DEBUG else "require"
                ),
            },
            "CONN_MAX_AGE": int(
                os.getenv("DB_CONN_MAX_AGE", "60")
            ),
        }
    }

else:
    # Existing local PostgreSQL configuration.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "reorbit_db"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": int(
                os.getenv("DB_CONN_MAX_AGE", "0")
            ),
        }
    }



# PASSWORD VALIDATION
# Preserved from your existing configuration.


AUTH_PASSWORD_VALIDATORS = []



# INTERNATIONALIZATION


LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True
USE_TZ = True



# STATIC FILES
# WhiteNoise serves collected static files in production.


STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}



# MEDIA / USER UPLOADS
# Local filesystem currently.
# Replace default storage with cloud storage before live uploads.


MEDIA_URL = "/uploads/"
MEDIA_ROOT = BASE_DIR / "uploads"



# DEFAULT PRIMARY KEY


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"



# CORS / CSRF


from corsheaders.defaults import default_headers  # noqa: E402

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    (
        "http://localhost:4028,"
        "http://127.0.0.1:4028,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    ),
)

# The checkout sends an Idempotency-Key header (stops a double tap creating two orders).
# Browsers only allow it cross-origin if it is listed here.
CORS_ALLOW_HEADERS = (*default_headers, "idempotency-key")

CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    ",".join(CORS_ALLOWED_ORIGINS)
)



# DJANGO REST FRAMEWORK


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.ReOrbitJWTAuthentication",
    ],

    "DEFAULT_PERMISSION_CLASSES": [
        "apps.accounts.permissions.IsReOrbitAuthenticated",
    ],

    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],

    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",

    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",

    "PAGE_SIZE": 20,

    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],

    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/min",
        "user": "600/min",
        "auth": "20/min",
        "otp_send": "5/min",
        "otp_verify": "5/min",
        "otp_ip": "20/min",
    },
}



# OTP CONFIGURATION


OTP_RESEND_COOLDOWN_SECONDS = int(
    os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30")
)



# JWT CONFIGURATION


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),

    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,

    "UPDATE_LAST_LOGIN": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}



# EMAIL CONFIGURATION


EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend"
)

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "").strip()
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "").strip()

DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    f"ReOrbit <{EMAIL_HOST_USER or 'no-reply@reorbit.local'}>"
)


# Mailjet transactional email API (HTTPS; avoids outbound SMTP restrictions).
MAILJET_API_KEY = os.getenv("MAILJET_API_KEY", "").strip()
MAILJET_SECRET_KEY = os.getenv("MAILJET_SECRET_KEY", "").strip()
MAILJET_SENDER_EMAIL = os.getenv("MAILJET_SENDER_EMAIL", "").strip()
MAILJET_API_URL = "https://api.mailjet.com/v3.1/send"



# GOOGLE SIGN-IN


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()

# RAZORPAY
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")


# PRODUCTION SECURITY

if not DEBUG:
    SESSION_COOKIE_SECURE = env_bool(
        "SESSION_COOKIE_SECURE", True
    )

    CSRF_COOKIE_SECURE = env_bool(
        "CSRF_COOKIE_SECURE", True
    )

    SECURE_SSL_REDIRECT = env_bool(
        "SECURE_SSL_REDIRECT", False
    )

    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO",
        "https"
    )

    SECURE_HSTS_SECONDS = int(
        os.getenv("SECURE_HSTS_SECONDS", "0")
    )

    SECURE_CONTENT_TYPE_NOSNIFF = True

    X_FRAME_OPTIONS = "DENY"

    if SECURE_HSTS_SECONDS > 0:
        SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
            "SECURE_HSTS_INCLUDE_SUBDOMAINS", False
        )



# LOGGING


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,

    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },

    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO"),
    },
}
