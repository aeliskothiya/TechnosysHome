import { useEffect, useRef, useState } from 'react';
import { Image, Send, X } from 'lucide-react';

export default function MessageInput({ onSend }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  function handleChange(e) {
    setText(e.target.value);
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    const filtered = files.slice(0, 5).filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        alert(`${f.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });
    setImages(prev => [...prev, ...filtered].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(idx) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    if (!text.trim() && images.length === 0) return;
    if (sending) return;
    
    setSending(true);
    try {
      await onSend?.({ text: text.trim(), images });
      setText('');
      setImages([]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="p-4">
      {/* Image Preview */}
      {images.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img 
                src={URL.createObjectURL(img)} 
                alt="Preview" 
                className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            disabled={sending}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>

        {/* Image Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || images.length >= 5}
          className="p-3 text-gray-600 hover:bg-gray-100 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add images (max 5, 5MB each)"
        >
          <Image size={24} />
        </button>
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleFiles} 
          className="hidden"
        />

        {/* Send Button */}
        <button 
          onClick={handleSend}
          disabled={sending || (!text.trim() && images.length === 0)}
          className="px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Send size={20} />
              <span>Send</span>
            </>
          )}
        </button>
      </div>

      {images.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {images.length}/5 images selected
        </p>
      )}
    </div>
  );
}
