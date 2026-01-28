from rest_framework import serializers
from .models import Conversation, Message
from users.models import CustomUser


class UserPreviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "username", "full_name", "email"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserPreviewSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "content", "timestamp"]


class ConversationSerializer(serializers.ModelSerializer):
    participants = UserPreviewSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "participants", "created_at", "updated_at", "last_message"]

    def get_last_message(self, obj):
        message = obj.messages.order_by("-timestamp").first()
        return MessageSerializer(message).data if message else None