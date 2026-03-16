// UPDATED CHAT.JS — Unread handled on frontend + Attractive UI
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "../state/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

const Chat = () => {
  const { user, accessToken } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const unreadCache = useRef({}); // 🔵 NEW: Track unread entirely frontend-side

  const messagesEndRef = useRef(null);
  const convPollRef = useRef(null);
  const msgPollRef = useRef(null);

  const location = useLocation();
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();

  // Helper fetch
  const authFetch = useCallback(
    (url, opts = {}) =>
      fetch(url, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
          ...(opts.headers || {}),
        },
      }),
    [accessToken]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ============================================================
      FRONTEND UNREAD CALCULATION
  ============================================================ */

  const computeUnread = (conversationId, messageList) => {
    if (!unreadCache.current[conversationId]) {
      unreadCache.current[conversationId] = {
        lastRead: 0,
        unreadCount: 0,
      };
    }

    const meta = unreadCache.current[conversationId];

    const unread = messageList.filter(
      (m, i) =>
        i >= meta.lastRead &&
        m.sender?.username !== user.username
    ).length;

    meta.unreadCount = unread;
    return unread;
  };

  const markAsRead = (conversationId, totalMessages) => {
    unreadCache.current[conversationId] = {
      lastRead: totalMessages,
      unreadCount: 0,
    };
  };

  /* ============================================================
      Fetch Conversations
  ============================================================ */

  const fetchConversations = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/chat/conversations/`);
      if (!res.ok) return;

      const data = await res.json();

      // attach computed unread count
      const updated = data.map((conv) => ({
        ...conv,
        unread_count:
          unreadCache.current[conv.id]?.unreadCount || 0,
      }));

      setConversations(updated);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  }, [authFetch]);

  /* ============================================================
      Fetch Messages
  ============================================================ */

  const fetchMessages = useCallback(
    async (conversationId) => {
      try {
        const res = await authFetch(
          `${API_BASE}/api/chat/conversation/${conversationId}/messages/`
        );
        if (!res.ok) return;

        const data = await res.json();

        // compute unread on frontend
        computeUnread(conversationId, data);

        setMessages(data);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authFetch]
  );

  /* ============================================================
      Open Conversation
  ============================================================ */

  const openConversation = useCallback(
    async (conv) => {
      setActiveConv(conv);
      setMessages([]);

      await fetchMessages(conv.id);

      // mark as read now that user opened it
      markAsRead(conv.id, 99999);

      scrollToBottom();

      if (msgPollRef.current) clearInterval(msgPollRef.current);

      msgPollRef.current = setInterval(
        () => fetchMessages(conv.id),
        2500
      );
    },
    [fetchMessages]
  );

  /* ============================================================
      Send Message
  ============================================================ */

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv) return;

    const payload = { content: newMessage.trim() };

    try {
      const res = await authFetch(
        `${API_BASE}/api/chat/conversation/${activeConv.id}/send/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) return;

      const sent = await res.json();
      setMessages((prev) => [...prev, sent]);
      markAsRead(activeConv.id, messages.length + 1);

      setNewMessage("");
      scrollToBottom();
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  /* ============================================================
      Auto-open ?conversation=
  ============================================================ */

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const convId = queryParams.get("conversation");

    if (convId && conversations.length > 0) {
      const conv = conversations.find((c) => String(c.id) === String(convId));
      if (conv) openConversation(conv);
    }
  }, [location, conversations, openConversation]);

  /* ============================================================
      Initial Load
  ============================================================ */

  useEffect(() => {
    fetchConversations();
    convPollRef.current = setInterval(fetchConversations, 5000);

    return () => {
      clearInterval(convPollRef.current);
      clearInterval(msgPollRef.current);
    };
  }, [fetchConversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ============================================================
      UI STARTS HERE — NEW BEAUTIFUL DESIGN
  ============================================================ */

  return (
    <div className="flex h-[85vh] bg-gradient-to-br from-indigo-50 via-white to-indigo-100 shadow-xl rounded-2xl overflow-hidden border border-indigo-200">
      {/* Sidebar */}
      <aside className="w-1/3 bg-white/70 backdrop-blur-md border-r border-gray-200 overflow-y-auto">
        <div className="p-4 text-lg font-semibold text-gray-700 bg-indigo-200/60 shadow">
          Conversations
        </div>

        {conversations.length ? (
          conversations.map((conv) => {
            const other = conv.participants.find(
              (p) => p.username !== user.username
            );

            const unread = conv.unread_count > 0;

            return (
              <div
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`p-4 flex items-center gap-3 cursor-pointer transition rounded ${
                  activeConv?.id === conv.id
                    ? "bg-indigo-100"
                    : unread
                    ? "bg-indigo-50 shadow-sm"
                    : "hover:bg-gray-100"
                }`}
              >
                <div className="relative">
                  <img
                    src={
                      other?.profile_image ||
                      "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                    }
                    alt={other?.username}
                    className="w-10 h-10 rounded-full border"
                  />
                  {unread && (
                    <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs px-1.5 rounded-full animate-bounce">
                      {conv.unread_count}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-gray-800 capitalize">
                    {other?.full_name || other?.username}
                  </p>
                  <p
                    className={`text-sm truncate ${
                      unread ? "font-semibold text-indigo-700" : "text-gray-500"
                    }`}
                  >
                    {conv.last_message?.content || "No messages yet"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="p-4 text-gray-500">No conversations yet.</p>
        )}
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col bg-white/60 backdrop-blur-lg">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-white flex items-center gap-3 shadow-sm">
              {activeConv.participants
                .filter((p) => p.username !== user.username)
                .map((p) => (
                  <div key={p.username} className="flex items-center gap-3">
                    <img
                      src={
                        p.profile_image ||
                        "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                      }
                      alt={p.username}
                      className="w-10 h-10 rounded-full border"
                    />
                    <div>
                      <p className="font-medium text-gray-800">
                        {p.full_name || p.username}
                      </p>
                      <p className="text-xs text-gray-500">@{p.username}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-white to-indigo-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-3 flex ${
                    msg.sender?.username === user.username
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl text-sm shadow ${
                      msg.sender?.username === user.username
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white flex gap-3 border-t">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-full border focus:ring-2 focus:ring-indigo-400"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="px-5 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
            Select a conversation to start chatting
          </div>
        )}
      </main>
    </div>
  );
};

export default Chat;