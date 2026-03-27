from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def health_check(request):
    """
    Simple health check endpoint for keep-alive pings.
    Used by Render keep-alive middleware to prevent server spin-down.
    """
    return Response({"status": "ok", "message": "Server is alive"})


def api_overview(request):
    data = {
        "message": "Welcome to the SkillShare Hub API",
        "endpoints": {
            "users": "/api/users/",
            "courses": "/api/courses/",
            "bookings": "/api/bookings/",
        },
    }
    return JsonResponse(data)
