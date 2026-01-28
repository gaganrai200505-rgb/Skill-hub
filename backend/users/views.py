from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from .models import CustomUser,Profile, Skill, SkillCategory
from .serializers import UserSerializer, UserProfileSerializer, SkillSerializer
from rest_framework.response import Response 
from users.serializers import PublicUserSerializer
from  chat.models import Conversation, Message
from .serializers import ConversationListSerializer, MessageSerializer, UserPreviewSerializer
from courses.models import Course
from courses.serializers import CourseSerializer
from django.contrib.auth import get_user_model


# ✅ Generate JWT tokens
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }

# ✅ Register User
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data
    try:
        if not all(k in data for k in ["username", "email", "password"]):
            return Response({"detail": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        if CustomUser.objects.filter(username=data["username"]).exists():
            return Response({"detail": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
        if CustomUser.objects.filter(email=data["email"]).exists():
            return Response({"detail": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.create(
            username=data["username"],
            email=data["email"],
            full_name=data.get("full_name", "")
        )
        user.set_password(data["password"])
        user.save()

        profile = Profile.objects.create(
            user=user,
            bio=data.get("bio", ""),
            contact=data.get("contact", ""),
        )

        # ✅ Handle skills (auto-capitalize + deduplicate)
        skills_data = data.get("skills", [])
        if isinstance(skills_data, str):
            skills_data = [s.strip() for s in skills_data.split(",") if s.strip()]

        if skills_data:
            skill_objects = []
            for skill_name in skills_data:
                formatted_name = skill_name.strip().capitalize()
                skill_obj, _ = Skill.objects.get_or_create(
                    name__iexact=formatted_name,
                    defaults={"name": formatted_name}
                )
                skill_objects.append(skill_obj)
            profile.skills.set(skill_objects)

        profile.save()
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ✅ Login User
@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    data = request.data
    username = data.get("username")
    password = data.get("password")
    user = authenticate(username=username, password=password)

    if user is not None:
        tokens = get_tokens_for_user(user)
        serializer = UserSerializer(user)
        return Response({"user": serializer.data, "tokens": tokens}, status=status.HTTP_200_OK)
    else:
        return Response({"error": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)


# ✅ Get User Profile (logged in user)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    try:
        user = request.user
        profile = Profile.objects.get(user=user)

        skills_list = list(profile.skills.values("id", "name", "description", "category"))

        data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.get_full_name() or user.username,

            # 🔥 ALL PROFILE FIELDS INCLUDED HERE
            "profile": {
                "bio": profile.bio or "",
                "contact": profile.contact or "",
                "skills": skills_list,
                "profile_image": profile.profile_image.url if profile.profile_image else None,
            }
        }

        return Response(data, status=status.HTTP_200_OK)

    except Profile.DoesNotExist:
        return Response({"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# ✅ Update User Profile
@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    """
    Update the authenticated user's Profile (bio, contact, profile_image, skills).
    Accepts skills as JSON array string, list, or comma-separated string.
    """
    try:
        user = request.user
        profile, created = Profile.objects.get_or_create(user=user)
        data = request.data

        profile.bio = data.get("bio", profile.bio or "")
        profile.contact = data.get("contact", profile.contact or "")

        if "profile_image" in request.FILES:
            profile.profile_image = request.FILES["profile_image"]

        # parse skills in various forms
        skills_data = data.get("skills", [])
        if isinstance(skills_data, str):
            import json
            try:
                skills_data = json.loads(skills_data)
            except Exception:
                skills_data = [s.strip() for s in skills_data.split(",") if s.strip()]

        if skills_data:
            skill_objects = []
            for skill_name in skills_data:
                if not skill_name:
                    continue
                formatted_name = skill_name.strip().capitalize()
                # create/get by case-insensitive match
                obj, _ = Skill.objects.get_or_create(name__iexact=formatted_name, defaults={"name": formatted_name})
                # fallback if get_or_create didn't work as expected:
                if obj is None:
                    obj, _ = Skill.objects.get_or_create(name=formatted_name)
                skill_objects.append(obj)
            profile.skills.set(skill_objects)

        profile.save()
        serializer = UserProfileSerializer(profile, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
# ✅ Get All Skills
@api_view(["GET"])
@permission_classes([AllowAny])
def get_all_skills(request):
    skills = Skill.objects.select_related("category")
    serializer = SkillSerializer(skills, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ✅ Get All Categories
@api_view(["GET"])
@permission_classes([AllowAny])
def get_all_categories(request):
    categories = SkillCategory.objects.all()
    data = [{"id": cat.id, "name": cat.name} for cat in categories]
    return Response(data, status=status.HTTP_200_OK)


# ✅ Get Users by Skill


@api_view(["GET"])
def get_users_by_skill(request, skill_id):
    try:
        skill = Skill.objects.get(pk=skill_id)
    except Skill.DoesNotExist:
        return Response({"error": "Skill not found"}, status=404)

    # Query UserProfile because skills belong to UserProfile
    profiles = Profile.objects.filter(skills=skill).select_related("user")

    users = []
    for profile in profiles:
        users.append({
            "username": profile.user.username,
            "full_name": profile.user.full_name,
            "email": profile.user.email,
            "profile_image": profile.profile_image.url if profile.profile_image else None,
        })

    return Response(users)
# ✅ Public User Profile (for frontend /users/:username)
try:
    from courses.models import Course
    from courses.serializers import CourseSerializer
except Exception:
    Course = None
    CourseSerializer = None

User = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def get_public_user_profile(request, username):
    """
    Returns public profile for username, including user's profile fields + their courses (if any)
    Structure matches frontend expectations: full_name, username, email (optional), profile_image, bio, contact, skills, courses
    """
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    # profile may be missing -- handle gracefully
    profile_data = {}
    try:
        profile = Profile.objects.get(user=user)
        profile_data = {
            "bio": profile.bio,
            "contact": profile.contact,
            "profile_image": profile.profile_image.url if profile.profile_image else None,
            "skills": [{"name": s.name} for s in profile.skills.all()] if hasattr(profile, "skills") else [],
        }
    except Profile.DoesNotExist:
        profile_data = {"bio": "", "contact": "", "profile_image": None, "skills": []}

    result = {
        "username": user.username,
        "full_name": user.get_full_name() or user.username,
        "email": user.email if user.email else None,
        **profile_data,
    }

    # attach courses if courses serializer is available
    if CourseSerializer:
        courses = Course.objects.filter(instructor=user).order_by("-created_at")
        result["courses"] = CourseSerializer(courses, many=True, context={"request": request}).data
    else:
        result["courses"] = []

    return Response(result, status=status.HTTP_200_OK)

# backend/users/views.py  (or backend/chat/views.py)

# users/views.py (append these imports and views)

# List conversations for current user
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_conversations(request):
    user = request.user
    convos = Conversation.objects.filter(participants=user).order_by("-updated_at")
    serializer = ConversationListSerializer(convos, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# create or get a 1:1 conversation by username
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_or_get_conversation(request):
    other_username = request.data.get("username")
    if not other_username:
        return Response({"error": "username is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        other = CustomUser.objects.get(username=other_username)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    # check for existing conversation with exactly these two participants
    user = request.user
    convos = Conversation.objects.filter(participants=user).filter(participants=other).distinct()
    # if multiple, pick most recent
    convo = convos.order_by("-updated_at").first()
    if convo:
        serializer = ConversationListSerializer(convo, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # create new conversation
    convo = Conversation.objects.create()
    convo.participants.add(user, other)
    convo.save()
    serializer = ConversationListSerializer(convo, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# list messages for a conversation
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_messages(request, conv_id):
    convo = get_object_or_404(Conversation, id=conv_id)
    if request.user not in convo.participants.all():
        return Response({"error": "Not a participant"}, status=status.HTTP_403_FORBIDDEN)

    messages = convo.messages.all().order_by("created_at")
    serializer = MessageSerializer(messages, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# send message in a conversation
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request, conv_id):
    convo = get_object_or_404(Conversation, id=conv_id)
    if request.user not in convo.participants.all():
        return Response({"error": "Not a participant"}, status=status.HTTP_403_FORBIDDEN)

    text = request.data.get("text", "").strip()
    if not text:
        return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)

    msg = Message.objects.create(conversation=convo, sender=request.user, text=text)
    convo.updated_at = msg.created_at
    convo.save()

    serializer = MessageSerializer(msg, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)