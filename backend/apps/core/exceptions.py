"""API-wide exception handler. Every error leaves in the same envelope."""

import logging

from django.core.exceptions import PermissionDenied
from django.db import IntegrityError
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def _first_message(detail):
    if isinstance(detail, dict):
        for value in detail.values():
            return _first_message(value)
    if isinstance(detail, (list, tuple)):
        return _first_message(detail[0]) if detail else "Invalid request."
    return str(detail)


def api_exception_handler(exc, context):
    if isinstance(exc, IntegrityError):
        # A unique / check constraint fired, usually a race between two requests.
        logger.warning("IntegrityError: %s", exc)
        return Response(
            {
                "success": False,
                "message": "This conflicts with an existing record.",
                "code": "CONFLICT",
            },
            status=status.HTTP_409_CONFLICT,
        )
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    response = exception_handler(exc, context)
    if response is None:
        return None  # real server error: Django logs it and returns 500

    data = response.data
    body = {"success": False, "message": _first_message(data)}
    if isinstance(exc, exceptions.ValidationError) and isinstance(data, dict):
        body["errors"] = data
        body["message"] = "Please correct the highlighted fields."
    if isinstance(exc, exceptions.Throttled):
        body["code"] = "RATE_LIMITED"
        body["retry_after"] = exc.wait
        wait = int(exc.wait or 60) + 1
        body["message"] = f"Too many attempts. Please try again in {wait} seconds."
    response.data = body
    return response
