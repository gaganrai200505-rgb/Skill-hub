# backend/courses/admin.py
from django.contrib import admin
from .models import Course, Enrollment

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "instructor", "price", "duration", "created_at")
    list_filter = ("instructor", "created_at")
    search_fields = ("title", "description", "instructor__username")
    
@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "course", "status", "timeslot")
    list_filter = ("status", "created_at", "course")
    search_fields = ("student_username", "course_title")
    raw_id_fields = ("student", "course")
    ordering = ("-created_at",)