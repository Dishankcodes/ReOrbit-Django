from datetime import timedelta
from pathlib import Path
import os

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Base directory.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env. Real environment variables win over the file.
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


# Security settings.
DEBUG = env_bool("DEBUG", False)

SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-only-insecure-key-do-not-use-in-production"
    else:
        raise ImproperlyConfigured(
            "SECRET_KEY is not set. Add SECRET_KEY=... to backend/.env "
            "(for local work you can also set DEBUG=True)."
        )

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "127.0.0.1,localhost")


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
    "apps.jobs",
    "apps.rewards",
    "apps.messaging",
    "apps.adminops",
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
        "NAME": os.getenv("DB_NAME", "reorbit_db"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}


# Password rules (used by register and reset-password).
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Internationalization settings.
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True


# Static files.
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Uploaded files live in backend/uploads/ and are served at /uploads/ in development.
# They go through Django's STORAGES, so S3 or Cloudinary can replace the "default"
# backend later without touching any model or view.
MEDIA_URL = "/uploads/"
MEDIA_ROOT = BASE_DIR / "uploads"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# Default primary key.
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# CORS / CSRF.
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:4028,http://127.0.0.1:4028,http://localhost:5173,http://127.0.0.1:5173",
)
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", ",".join(CORS_ALLOWED_ORIGINS))


# Django REST Framework configuration.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.ReOrbitJWTAuthentication",
    ],
    # Every endpoint needs a signed-in account unless it says otherwise.
    "DEFAULT_PERMISSION_CLASSES": [
        "apps.accounts.permissions.IsReOrbitAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
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
        "auth": "20/min",  # login, register, token refresh
        "otp_send": "6/hour",  # emailing a code
        "otp_verify": "30/hour",  # checking a code / reset token
    },
}

# Seconds a person must wait before another emailed code (0 turns it off, used in tests).
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))


# JWT configuration.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# Email configuration.
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend"
    if DEBUG
    else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "").strip()
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "").strip()
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL", f"ReOrbit <{EMAIL_HOST_USER or 'no-reply@reorbit.local'}>"
)


# Razorpay (used from Domain A phase A4; test keys first). Never commit real keys.
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")


# Production hardening (only when DEBUG is off).
if not DEBUG:
    SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", True)
    CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", True)
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", False)
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0"))
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    if env_bool("USE_X_FORWARDED_PROTO", False):
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": os.getenv("LOG_LEVEL", "INFO")},
}
