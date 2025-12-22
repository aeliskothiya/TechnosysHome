import { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';

// Helper function to format smart timestamps
function getSmartTimestamp(date) {
  const now = new Date();
  const msgDate = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());

  if (msgDay.getTime() === today.getTime()) {
    return 'Today';
  } else if (msgDay.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else if (now - msgDate < 7 * 24 * 60 * 60 * 1000) {
    return msgDate.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// Group messages by date
function groupMessagesByDate(messages) {
  const groups = [];
  let currentGroup = null;

  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt);
    const dateKey = msgDate.toDateString();

    if (!currentGroup || currentGroup.dateKey !== dateKey) {
      currentGroup = {
        dateKey,
        label: getSmartTimestamp(msgDate),
        messages: [],
      };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  });

  return groups;
}

// Message status icon component
function MessageStatus({ message, isMe }) {
  if (!isMe) return null;

  const status = message.ReadAt ? 'read' : message.DeliveredAt ? 'delivered' : 'sent';

  if (status === 'read') {
    return <CheckCheck size={16} className="text-blue-600" />;
  } else if (status === 'delivered') {
    return <CheckCheck size={16} className="opacity-70" />;
  } else {
    return <Check size={16} className="opacity-70" />;
  }
}

export default function ChatWindow({ messages, currentUserId, onLoadMore, hasMore, loading }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Handle scroll to detect if user is near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);

      // Load more messages when scrolling to top
      if (scrollTop < 100 && hasMore && !loading && onLoadMore) {
        onLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, onLoadMore]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-gray-400">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Start the conversation!</p>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto p-4 space-y-3">
      {/* Loading indicator for pagination */}
      {loading && (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {groupedMessages.map((group, groupIdx) => (
        <div key={group.dateKey}>
          {/* Date separator */}
          <div className="flex items-center justify-center my-4">
            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm">
              {group.label}
            </div>
          </div>

          {/* Messages in this date group */}
          {group.messages.map((m) => {
            const isMe = String(m.SenderID) === String(currentUserId);
            return (
              <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${
                  isMe 
                    ? 'bg-green-500 text-white rounded-br-sm' 
                    : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                }`}>
                  {m.MessageText && (
                    <div className="whitespace-pre-wrap break-words">{m.MessageText}</div>
                  )}
                  {Array.isArray(m.Attachments) && m.Attachments.length > 0 && (
                    <div className={`grid gap-2 ${m.MessageText ? 'mt-2' : ''}`} style={{
                      gridTemplateColumns: m.Attachments.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(140px, 1fr))'
                    }}>
                      {m.Attachments.map((a, idx) => (
                        <img 
                          key={idx} 
                          src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/${a.path}`} 
                          alt={a.originalName}
                          className="rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
                          style={{ width: '100%', height: m.Attachments.length === 1 ? 'auto' : '140px', maxHeight: '300px' }}
                          onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/${a.path}`, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1.5">
                    <span className="text-xs opacity-70">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <MessageStatus message={m} isMe={isMe} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
