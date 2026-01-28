from rest_framework import serializers
from .models import CustomUser, Profile, Skill, SkillCategory
from chat.models import Conversation, Message


# ✅ Basic User Serializer
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "username", "email", "full_name"]


# ✅ Lightweight User Preview Serializer (for chat lists, etc.)
class UserPreviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "username", "full_name"]


# ✅ Skill Serializer
class SkillSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Skill
        fields = ["id", "name", "description", "category"]


# ✅ Skill Category Serializer
class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ["id", "name"]


# ✅ User Profile Serializer
class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    skills = SkillSerializer(many=True, read_only=True)

    class Meta:
        model = Profile
        fields = [
            "user",
            "bio",
            "contact",
            "skills",
            "profile_image",
            
        ]
        def get_user (self, obj):
            return {
                "id": obj.user.id,
                "username": obj.user.username,
                
                "email": obj.user.email,
                "full_name": obj.user.full_name,
            }


    def get_profile_image(self, obj):
        request = self.context.get("request")
        if obj.profile_image:
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None


# ✅ Chat Serializers
# -----------------------------

# 🗨 Conversation Serializer (full detail)
class ConversationSerializer(serializers.ModelSerializer):
    participants = UserPreviewSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "participants", "created_at"]


# 🗂 Lightweight list serializer for chats
class ConversationListSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "other_user", "created_at"]

    def get_other_user(self, obj):
        request_user = self.context.get("request").user
        other = obj.participants.exclude(id=request_user.id).first()
        if other:
            return UserPreviewSerializer(other).data
        return None


# 💬 Message Serializer
class MessageSerializer(serializers.ModelSerializer):
    sender = UserPreviewSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "content", "timestamp"]
        
        from rest_framework import serializers
from users.models import CustomUser, Profile, Skill


class PublicUserSerializer(serializers.ModelSerializer):
    """
    Serializer for public-facing user profiles.
    Shows only non-sensitive fields.
    """
    bio = serializers.CharField(source='profile.bio', allow_blank=True, required=False)
    contact = serializers.CharField(source='profile.contact', allow_blank=True, required=False)
    skills = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['username', 'full_name', 'email', 'bio', 'contact', 'skills', 'profile_image']

    def get_skills(self, obj):
        try:
            return [{"name": skill.name} for skill in obj.profile.skills.all()]
        except Exception:
            return []

    def get_profile_image(self, obj):
        request = self.context.get('request')
        if hasattr(obj.profile, 'profile_image') and obj.profile.profile_image:
            url = obj.profile.profile_image.url
            return request.build_absolute_uri(url) if request else url
        return None