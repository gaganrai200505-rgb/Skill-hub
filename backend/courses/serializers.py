from rest_framework import serializers
from .models import Course, TimeSlot, Enrollment
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


# courses/serializers.py

# serializers.py

class TimeSlotSerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = [
            "id",
            "instructor",
            "instructor_name",
            "course",
            "day_of_week",
            "hour",
            "created_at",
        ]

    def get_instructor_name(self, obj):
        return getattr(obj.instructor, "username", str(obj.instructor))



class CourseSerializer(serializers.ModelSerializer):
    instructor_id = serializers.IntegerField(source="instructor.id", read_only=True)
    instructor_name = serializers.CharField(source="instructor.username", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "instructor_id",
            "instructor_name",
            "title",
            "description",
            "duration",
            "price",
            "created_at",
        ]
        def get_instructor_name(self, obj):
            return getattr(obj.instructor, "username", str(obj.instructor))


class EnrollmentSerializer(serializers.ModelSerializer):
    student_username = serializers.SerializerMethodField(read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    timeslot = TimeSlotSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",
            "student_username",
            "course",
            "course_title",
            "timeslot",
            "status",
            "created_at",
        ]
        read_only_fields = ["created_at", "student", "student_username", "course_title"]

    def get_student_username(self, obj):
        try:
            return obj.student.username
        except:
            return ""
       


class TimeSlotCreateSerializer(serializers.ModelSerializer):
    """
    Serializer used for creating timeslots. Accepts:
      - day_of_week (0..6) and hour (0..23)
    """
    class Meta:
        model = TimeSlot
        fields = ("course", "instructor", "day_of_week", "hour")

    def validate(self, data):
        # basic validation
        if data.get("day_of_week") is None or data.get("hour") is None:
            raise serializers.ValidationError({"error": "day_of_week and hour are required"})
        hour = data.get("hour")
        if not (0 <= hour <= 23):
            raise serializers.ValidationError({"error": "hour must be between 0 and 23"})
        dow = data.get("day_of_week")
        if not (0 <= dow <= 6):
            raise serializers.ValidationError({"error": "day_of_week must be 0..6"})
        return data

    def create(self, validated_data):
        # ensure instructor equals course.instructor? We'll trust the view to provide correct instructor
        return super().create(validated_data)