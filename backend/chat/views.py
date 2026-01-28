from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.models import CustomUser
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

# ✅ Get all conversations for the logged-in user
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_conversations(request):
    conversations = Conversation.objects.filter(participants=request.user)
    serializer = ConversationSerializer(conversations, many=True)
    return Response(serializer.data)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_conversations(request):
    """
    ✅ Return all conversations for the logged-in user,
    including participants, last message, and unread count.
    """
    user = request.user

    # ✅ Fetch all conversations where user is a participant
    conversations = (
        Conversation.objects.filter(participants=user)
        .prefetch_related("participants", "messages__sender")
        .distinct()
    )

    results = []
    for conv in conversations:
        # ✅ Get the last message (if any)
        last_msg = conv.messages.order_by("-timestamp").first()

        # ✅ Count unread messages (not sent by current user)
        unread_count = conv.messages.filter(is_read=False).exclude(sender=user).count()

        # ✅ Serialize participants
        participants_data = []
        for p in conv.participants.all():
            participants_data.append({
                "username": p.username,
                "full_name": getattr(p, "full_name", None),
                "profile_image": (
                    request.build_absolute_uri(p.profile.profile_image.url)
                    if hasattr(p, "profile") and getattr(p.profile, "profile_image", None)
                    else None
                ),
            })

        # ✅ Append formatted conversation
        results.append({
            "id": conv.id,
            "participants": participants_data,
            "last_message": {
                "id": last_msg.id if last_msg else None,
                "content": last_msg.content if last_msg else "",
                "timestamp": last_msg.timestamp.isoformat() if last_msg else None,
            } if last_msg else None,
            "unread_count": unread_count,
        })

    # ✅ Return even if empty
    return Response(results, status=200)
# ✅ Create or return an existing conversation
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_conversation(request):
    username = request.data.get("username")
    if not username:
        return Response({"error": "Username is required"}, status=400)

    try:
        target_user = CustomUser.objects.get(username=username)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    user = request.user
    existing_conv = (
        Conversation.objects.filter(participants=user)
        .filter(participants=target_user)
        .first()
    )

    if existing_conv:
        serializer = ConversationSerializer(existing_conv)
        return Response(serializer.data, status=200)

    # create new
    conv = Conversation.objects.create()
    conv.participants.set([user, target_user])
    conv.save()

    serializer = ConversationSerializer(conv)
    return Response(serializer.data, status=201)

# ✅ Get messages in a conversation
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_messages(request, pk):
    try:
        conv = Conversation.objects.get(pk=pk, participants=request.user)
    except Conversation.DoesNotExist:
        return Response({"error": "Conversation not found"}, status=404)

    messages = Message.objects.filter(conversation=conv).order_by("timestamp")
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)

# ✅ Send a message in a conversation
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request, pk):
    try:
        conv = Conversation.objects.get(pk=pk, participants=request.user)
    except Conversation.DoesNotExist:
        return Response({"error": "Conversation not found"}, status=404)

    content = request.data.get("content", "").strip()
    if not content:
        return Response({"error": "Message content is required"}, status=400)

    msg = Message.objects.create(conversation=conv, sender=request.user, content=content)
    serializer = MessageSerializer(msg)
    return Response(serializer.data, status=201)