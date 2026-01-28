from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import Course, Enrollment, TimeSlot
from .serializers import CourseSerializer, EnrollmentSerializer, TimeSlotSerializer, TimeSlotCreateSerializer
import requests
from chat.models import Conversation, Message
User = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def list_courses(request):
    courses = Course.objects.select_related("instructor").all().order_by("-created_at")
    serializer = CourseSerializer(courses, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_course(request):
    user = request.user
    data = request.data

    title = data.get("title")
    description = data.get("description")
    duration = data.get("duration")
    price = data.get("price")

    if not title or not description:
        return Response({"error": "Title and description are required."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        duration_val = int(duration) if duration not in (None, "") else 0
    except (ValueError, TypeError):
        duration_val = 0

    try:
        price_val = float(price) if price not in (None, "") else 0.0
    except (ValueError, TypeError):
        price_val = 0.0

    course = Course.objects.create(
        instructor=user,
        title=title,
        description=description,
        duration=duration_val,
        price=price_val,
    )

    serializer = CourseSerializer(course, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_courses_by_user(request, username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "user not found"}, status=404)

    courses = Course.objects.filter(instructor=user).order_by("-created_at")
    serializer = CourseSerializer(courses, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_slot(request, course_id):

    data = {
        "course": course_id,
        "instructor": request.user.id,
        "day_of_week": request.data.get("day_of_week"),
        "hour": request.data.get("hour"),
    }

    serializer = TimeSlotCreateSerializer(data=data)

    if serializer.is_valid():
        slot = serializer.save()
        return Response(TimeSlotSerializer(slot).data, status=201)

    return Response(serializer.errors, status=400)

from courses.models import TimeSlot
from courses.serializers import TimeSlotSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_instructor_course_slots(request, course_id):
    slots = TimeSlot.objects.filter(course_id=course_id).order_by("day_of_week", "hour")
    serializer = TimeSlotSerializer(slots, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enroll_in_course(request, course_id):
    student = request.user
    timeslot_id = request.data.get("timeslot_id") or request.data.get("slot_id") or request.data.get("time_slot_id")

    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)

    timeslot = None
    if timeslot_id:
        try:
            timeslot = TimeSlot.objects.get(id=timeslot_id)
        except TimeSlot.DoesNotExist:
            return Response({"error": "Invalid timeslot"}, status=400)

        if timeslot.is_booked:
            return Response({"error": "Timeslot already booked"}, status=400)

        if timeslot.instructor != course.instructor:
            return Response({"error": "Timeslot does not belong to course instructor"}, status=400)

        timeslot.is_booked = True
        timeslot.save()

    enr = Enrollment.objects.create(
        student=student,
        course=course,
        timeslot=timeslot,
        status="pending"
    )

    serializer = EnrollmentSerializer(enr, context={"request": request})
    return Response(serializer.data, status=201)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_enrollment_status(request, course_id, enrollment_id):
    try:
        enrollment = Enrollment.objects.get(id=enrollment_id, course_id=course_id)
    except Enrollment.DoesNotExist:
        return Response({"detail": "Enrollment not found."}, status=404)

    status_value = request.data.get("status")
    if status_value not in ["accepted", "rejected"]:
        return Response({"detail": "Invalid status."}, status=400)

    enrollment.status = status_value
    enrollment.save()

    # -----------------------------------------------------
    #  APPEND CHAT NOTIFICATION  (Option C)
    # -----------------------------------------------------
   # --- Send chat message to student when enrollment is accepted ---
    if enrollment.status == "accepted":
        student = enrollment.student
        instructor = enrollment.course.instructor

        # Find or create conversation
        convo = Conversation.objects.filter(
            participants__in=[student]
        ).filter(
            participants__in=[instructor]
        ).first()

        if not convo:
            convo = Conversation.objects.create()
            convo.participants.add(student, instructor)

        # Send message
        Message.objects.create(
            conversation=convo,
            sender=instructor,
            content=f"Your enrollment request for '{enrollment.course.title}' has been accepted!"
        )
    return Response({"status": enrollment.status}, status=200)

@api_view(["GET"])
@permission_classes([AllowAny])
def get_course_detail( request , course_id):
    try:
        course = Course.objects.get(id=course_id)
        serializer = CourseSerializer(course)
        return Response(serializer.data,status=200)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_course_enrollments(request, course_id):
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response({"detail": "Course not found"}, status=404)

    if course.instructor != request.user:
        return Response({"detail": "Not authorized"}, status=403)

    enrollments = Enrollment.objects.filter(course=course)
    serializer = EnrollmentSerializer(enrollments, many=True)
    return Response(serializer.data)

# courses/views.py

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_weekly_slot(request, course_id):
    user = request.user

    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)

    if course.instructor != user:
        return Response({"error": "Not authorized"}, status=403)

    data = request.data

    slot = TimeSlot.objects.create(
        instructor=user,
        course=course,
        day_of_week=data["day_of_week"],
        start_time=data["start_time"],
        end_time=data["end_time"],
    )

    return Response(TimeSlotSerializer(slot).data, status=201)

@api_view(["GET"])
@permission_classes([AllowAny])
def get_course_slots(request, course_id):
    slots = TimeSlot.objects.filter(course_id=course_id, is_booked=False)
    serializer = TimeSlotSerializer(slots, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enroll_course_slot(request, course_id):
    student = request.user
    slot_id = request.data.get("slot_id")

    try:
        slot = TimeSlot.objects.get(id=slot_id, course_id=course_id)
    except TimeSlot.DoesNotExist:
        return Response({"error": "Slot not found"}, status=404)

    if slot.is_booked:
        return Response({"error": "Slot already booked"}, status=400)

    slot.is_booked = True
    slot.save()

    enr = Enrollment.objects.create(
        student=student,
        course_id=course_id,
        timeslot=slot,
        status="pending",
    )

    return Response(EnrollmentSerializer(enr).data, status=201)
# DELETE a timeslot for specific course/week/hour
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_slot(request, course_id):
    day = request.data.get("day_of_week")
    hour = request.data.get("hour")

    if day is None or hour is None:
        return Response({"error": "day_of_week and hour are required"}, status=400)

    try:
        slot = TimeSlot.objects.get(
            instructor=request.user,
            course_id=course_id,
            day_of_week=day,
            hour=hour
        )
    except TimeSlot.DoesNotExist:
        # ✔ Skip silently if slot doesn’t exist (Option A)
        return Response({"message": "OK"}, status=200)

    slot.delete()
    return Response({"message": "Deleted"}, status=200)