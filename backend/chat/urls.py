from django.urls import path
from . import views

urlpatterns = [
    path("conversations/", views.list_conversations, name="list_conversations"),
    path("start_conversation/", views.start_conversation, name="start_conversation"),
    path("conversation/<int:pk>/messages/", views.get_messages, name="get_messages"),
    path("conversation/<int:pk>/send/", views.send_message, name="send_message"),
]