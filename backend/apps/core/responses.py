"""One response envelope for the whole API: {success, message, data} (+ errors)."""

from rest_framework import status as http
from rest_framework.response import Response


def ok(data=None, message="OK", status=http.HTTP_200_OK):
    return Response(
        {"success": True, "message": message, "data": data}, status=status
    )


def created(data=None, message="Created."):
    return ok(data, message, http.HTTP_201_CREATED)


def fail(message, errors=None, status=http.HTTP_400_BAD_REQUEST, code=None):
    body = {"success": False, "message": message}
    if code:
        body["code"] = code
    if errors:
        body["errors"] = errors
    return Response(body, status=status)
