from django.http import JsonResponse

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
