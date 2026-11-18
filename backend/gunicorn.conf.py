"""Gunicorn settings, picked up automatically when gunicorn starts in this folder (Render).

Anything given on the start command (e.g. --workers 2) still wins over this file.
"""

import os

# Photo uploads (resize + save to Cloudinary) can take longer than gunicorn's default 30 s,
# especially right after the free Render instance wakes up. A killed worker gives the browser
# no answer at all, which shows up as "Unable to connect to the server".
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))
graceful_timeout = 30
keepalive = 5
# Free instances have 512 MB: two workers fit comfortably alongside Pillow.
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
