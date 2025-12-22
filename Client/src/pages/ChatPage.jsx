import { useEffect, useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';
import io from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const SOCKET_BASE = API_BASE; // same origin

export default function ChatPage({ bookingId, currentUser }) {
  const [socket, setSocket] = useState(null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  useEffect(() => {
    const s = io(SOCKET_BASE, { withCredentials: true });
    setSocket(s);

    // Register role room for targeted events
    if (currentUser?.role === 'technician') {
      s.emit('register-technician', currentUser._id);
    } else {
      s.emit('register-customer', currentUser._id);
    }

    return () => s.close();
  }, [currentUser]);

  useEffect(() => {
    async function init() {
      // Create or get chat
      const res = await fetch(`${API_BASE}/api/chat/${bookingId}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.success) return;
      setChat(data.chat);

      // Join chat room
      socket?.emit('join-chat', { chatId: data.chat._id, userId: currentUser._id });

      // Load history
      const hist = await fetch(`${API_BASE}/api/chat/${bookingId}/messages?page=1&limit=50`, { credentials: 'include' });
      const histData = await hist.json();
      if (histData.success) {
        setMessages(histData.messages);
        setUnreadCount(histData.unreadCount || 0);
        setHasMore(histData.pagination?.hasMore || false);
        
        // Immediately mark messages as read when chat opens
        const unreadMessages = histData.messages.filter(m => 
          !m.ReadAt && String(m.SenderID) !== String(currentUser._id)
        );
        
        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(m => m._id);
          
          // Mark as read in backend
          fetch(`${API_BASE}/api/chat/${bookingId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ messageIds }),
          }).catch(err => console.error('Failed to mark as read:', err));

          // Emit socket event
          socket?.emit('message-read', {
            chatId: data.chat._id,
            messageIds,
            userId: currentUser._id,
            userType: currentUser.role,
          });

          // Update local state
          setMessages(prev => prev.map(m => 
            messageIds.includes(m._id) ? { ...m, ReadAt: new Date() } : m
          ));
          setUnreadCount(0);
        }
      }
    }
    if (socket) init();
  }, [socket, bookingId, currentUser]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new-message', ({ chatId, message }) => {
      if (chatId !== chat?._id) return;
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      
      // Mark as read if chat is open
      if (document.hasFocus()) {
        markAsRead(chatId);
      } else {
        // Show browser notification if tab is inactive
        showNotification(message);
        setUnreadCount(prev => prev + 1);
      }
    });

    socket.on('messages-read', ({ messageIds }) => {
      setMessages(prev => prev.map(m => 
        messageIds.includes(m._id) ? { ...m, ReadAt: new Date() } : m
      ));
    });

    return () => {
      socket.off('new-message');
      socket.off('messages-read');
    };
  }, [socket, chat]);

  // Mark window focus to mark messages as read
  useEffect(() => {
    const handleFocus = () => {
      if (chat?._id && unreadCount > 0) {
        markAsRead(chat._id);
        setUnreadCount(0);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [chat, unreadCount]);

  async function markAsRead(chatId) {
    try {
      const unreadMessages = messages.filter(m => 
        !m.ReadAt && String(m.SenderID) !== String(currentUser._id)
      );
      
      if (unreadMessages.length === 0) return;

      const messageIds = unreadMessages.map(m => m._id);
      
      await fetch(`${API_BASE}/api/chat/${bookingId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageIds }),
      });

      // Emit socket event to notify sender
      socket?.emit('message-read', {
        chatId,
        messageIds,
        userId: currentUser._id,
        userType: currentUser.role,
      });

      // Update local state
      setMessages(prev => prev.map(m => 
        messageIds.includes(m._id) ? { ...m, ReadAt: new Date() } : m
      ));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }

  function showNotification(message) {
    // Request permission if not granted
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      const senderName = currentUser.role === 'customer' ? 'Technician' : 'Customer';
      const notification = new Notification(`New message from ${senderName}`, {
        body: message.MessageText || 'Sent an attachment',
        icon: '/favicon.ico',
        tag: `chat-${chat._id}`,
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  async function loadMoreMessages() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`${API_BASE}/api/chat/${bookingId}/messages?page=${nextPage}&limit=50`, { 
        credentials: 'include' 
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [...data.messages, ...prev]);
        setPage(nextPage);
        setHasMore(data.pagination?.hasMore || false);
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSend({ text, images }) {
    const form = new FormData();
    form.append('messageText', text);
    images.forEach((img) => form.append('images', img));

    const res = await fetch(`${API_BASE}/api/chat/${bookingId}/message`, {
      method: 'POST',
      body: form,
      credentials: 'include',
    });
    const data = await res.json();
    if (data.success) {
      // Only emit socket event - message will be added via socket listener
      socket?.emit('send-message', { chatId: chat._id, message: data.message });
    }
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  const readOnly = chat.readOnly;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Messages</h3>
          {readOnly && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
              Archived (read-only)
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ChatWindow 
          messages={messages} 
          currentUserId={currentUser._id}
          onLoadMore={loadMoreMessages}
          hasMore={hasMore}
          loading={loadingMore}
        />
      </div>
      
      {!readOnly && (
        <div className="flex-shrink-0 border-t bg-white">
          <MessageInput onSend={handleSend} />
        </div>
      )}
    </div>
  );
}
