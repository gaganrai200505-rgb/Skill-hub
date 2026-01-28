from django.db import models
from users.models import CustomUser

class Conversation(models.Model):
    participants = models.ManyToManyField(CustomUser, related_name="chat_conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # ✅ Add this field

    def _str_(self):
        return f"Conversation ({', '.join([p.username for p in self.participants.all()])})"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, related_name="messages", on_delete=models.CASCADE)
    sender = models.ForeignKey(CustomUser, related_name="sent_chat_messages", on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def _str_(self):
        return f"Message from {self.sender.username} in {self.conversation.id}"