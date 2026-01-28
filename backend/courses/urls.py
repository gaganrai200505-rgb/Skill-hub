# courses/urls.py
from django.urls import path, re_path
from . import views

urlpatterns = [
    path("", views.list_courses, name="list_courses"),
    path("create/", views.create_course, name="create_course"),
    re_path(r"^(?P<course_id>\d+)/enroll/?$", views.enroll_in_course, name="enroll_in_course"),
    re_path(r"^(?P<course_id>\d+)/enrollment/(?P<enrollment_id>\d+)/?$", 
        views.update_enrollment_status, 
        name="update_enrollment_status"),
    re_path(r"^(?P<course_id>\d+)/slots/create/?$", views.create_slot, name="create_slot"),

    # IMPORTANT: support both /api/courses/timeslots/ (no course_id) and /api/courses/<id>/timeslots/
    re_path(r"^(?P<course_id>\d+)/timeslots/?$", views.get_instructor_course_slots, name="get_instructor_course_slots"),
    re_path(r"^timeslots/?$", views.get_instructor_course_slots, name="get_instructor_course_slots"),


    re_path(r"^by-user/(?P<username>[\w.@+-]+)/?$", views.get_courses_by_user, name="get_courses_by_user"),
    re_path(r"^(?P<course_id>\d+)/?$", views.get_course_detail, name="course_detail"),
    re_path(r"^(?P<course_id>\d+)/enrollments/?$", views.get_course_enrollments, name="course_enrollments"),
    re_path(r"^(?P<course_id>\d+)/slots/delete/?$", views.delete_slot, name="delete_slot"),
]