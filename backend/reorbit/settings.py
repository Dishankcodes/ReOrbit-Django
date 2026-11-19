
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
    # first of all: REMOTE_ADDR becomes the visitor's real address (rate limits, audit logs)
    "apps.core.client_ip.RealClientIPMiddleware",
    # then time the whole request (Server-Timing header + "SLOW ..." log lines)
    "apps.core.timing.RequestTimingMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",

    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # runs scheduled announcements and finishes 30-day account deletions by itself (no cron needed)
    "apps.core.autojobs.AutoJobsMiddleware",
]

# Background jobs inside the web server (apps/core/autojobs.py). Set AUTO_JOBS=False in .env to turn off.
AUTO_JOBS = os.getenv("AUTO_JOBS", "True").lower() not in ("0", "false", "no")



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
            # Reuse the connection between requests: opening a new TLS connection to Neon costs
            # several round trips. Health checks replace a connection Neon closed while idle.
            "CONN_MAX_AGE": int(
                os.getenv("DB_CONN_MAX_AGE", "300")
            ),
            "CONN_HEALTH_CHECKS": True,
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



# PASSWORD RULES
# Checked whenever a password is set or changed (sign-up, change, reset, new admin). Existing
# passwords keep working. See apps/accounts/helpers.py: password_problem().
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
        "OPTIONS": {"user_attributes": ("email", "full_name")},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]



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
# Development: files are saved in backend/uploads/ and served at /uploads/.
# Production (DJANGO_ENV=production): files go to Cloudinary (apps/core/cloudinary_storage.py),
# so they survive redeploys. Set CLOUDINARY_URL (cloudinary://<key>:<secret>@<cloud_name>), or the
# three CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET values.


MEDIA_URL = "/uploads/"
MEDIA_ROOT = BASE_DIR / "uploads"

DJANGO_ENV = os.getenv("DJANGO_ENV", "development").strip().lower()
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "").strip()
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip()
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip()
CLOUDINARY_FOLDER = os.getenv("CLOUDINARY_FOLDER", "reorbit").strip().strip("/")
CLOUDINARY_READY = bool(CLOUDINARY_URL or (CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET))
# On by default in production; USE_CLOUDINARY=True/False overrides (e.g. to try it locally).
USE_CLOUDINARY = env_bool("USE_CLOUDINARY", DJANGO_ENV == "production")

if USE_CLOUDINARY:
    if not CLOUDINARY_READY:
        raise ImproperlyConfigured(
            "Cloudinary is on (DJANGO_ENV=production or USE_CLOUDINARY=True) but its keys are missing. "
            "Set CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
        )
    STORAGES["default"] = {"BACKEND": "apps.core.cloudinary_storage.CloudinaryMediaStorage"}



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
CORS_ALLOW_HEADERS = (*default_headers, "idempotency-key", "x-since")
# How long a browser may reuse a CORS permission (the OPTIONS request) for the same address.
# Browsers cap it (Chrome at 2 hours); the message checks keep one address, so one OPTIONS per 2 hours.
CORS_PREFLIGHT_MAX_AGE = 86400

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

    # 0 = DRF reads REMOTE_ADDR (already the real visitor, see apps/core/client_ip.py) and never
    # trusts X-Forwarded-For itself, which callers can write.
    "NUM_PROXIES": 0,

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



# REAL VISITOR IP + SHARED CACHE (rate limits, login locks)
#
# Headers set by the edge that callers can't forge (Render sits behind Cloudflare). On by default in
# production; locally there is no proxy, so REMOTE_ADDR is used as is.
TRUSTED_IP_HEADERS = [
    "HTTP_" + h.strip().upper().replace("-", "_")
    for h in env_list(
        "TRUSTED_IP_HEADERS",
        "CF-Connecting-IP,True-Client-IP" if DJANGO_ENV == "production" else "",
    )
    if h.strip()
]
# Fallback when no such header arrives: how many proxies append to X-Forwarded-For
# (Render: Cloudflare + Render = 2, so the 2nd entry from the right is the visitor).
TRUSTED_PROXY_COUNT = int(os.getenv("TRUSTED_PROXY_COUNT", "2" if DJANGO_ENV == "production" else "0"))

# Two caches:
# - "default" stays in memory: fast page caches (home page, testimonials).
# - "shared" is a database table: rate-limit counters and login locks. Both gunicorn workers see
#   the same counts, and a restart, deploy or free-tier sleep doesn't reset them. The sign-in, code
#   and contact-form limits use it (apps/core/throttles.py); the general per-request limits stay in
#   memory so ordinary pages don't pay for a database round trip. The table is created by
#   migration core.0007_cache_table (no extra command needed).
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    },
    "shared": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "reorbit_cache",
        "TIMEOUT": 3600,
        "OPTIONS": {"MAX_ENTRIES": 20000, "CULL_FREQUENCY": 4},
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

# Other HTTPS email services. Set the key(s) on Render; the first that works sends.
# EMAIL_SENDER must be a sender address verified with that service.
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_SENDER = os.getenv("EMAIL_SENDER", "").strip()
EMAIL_SENDER_NAME = os.getenv("EMAIL_SENDER_NAME", "ReOrbit").strip() or "ReOrbit"
EMAIL_PROVIDERS = os.getenv("EMAIL_PROVIDERS", "").strip()  # optional order, e.g. "brevo,mailjet"



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


# REORBIT'S OWN DETAILS
# Shown on orders sold by ReOrbit itself (the "Sold by" card). They come from the default address
# in Admin › Addresses; these optional variables override it. Nothing is made up: a detail that
# isn't set anywhere is simply left out.

REORBIT_STORE = {
    "name": os.getenv("REORBIT_STORE_NAME", "ReOrbit").strip() or "ReOrbit",
    "address_line": os.getenv("REORBIT_STORE_ADDRESS", "").strip(),
    "city": os.getenv("REORBIT_STORE_CITY", "").strip(),
    "state": os.getenv("REORBIT_STORE_STATE", "").strip(),
    "pincode": os.getenv("REORBIT_STORE_PINCODE", "").strip(),
    "phone": os.getenv("REORBIT_STORE_PHONE", "").strip(),
}
