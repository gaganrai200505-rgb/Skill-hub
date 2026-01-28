from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.register_user, name="register"),
    path("login/", views.login_user, name="login"),
    path("profile/", views.get_user_profile, name="profile"),
    path("profile/update/", views.update_user_profile, name="update_profile"),

    # Skills and categories
    path("skills/", views.get_all_skills, name="get_all_skills"),
    path("skills/<int:skill_id>/users/", views.get_users_by_skill, name="get_users_by_skill"),
    path("categories/", views.get_all_categories, name="get_all_categories"),

    # ✅ Public user profile route
    path("public/<str:username>/", views.get_public_user_profile, name="get_public_user_profile"),
]
# backend/users/urls.py (or backend/chat/urls.py)


# users/urls.py (append)

