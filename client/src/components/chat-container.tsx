import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Volume, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/hooks/use-websocket";

interface ChatContainerProps {
  messages: Message[];
  isGuardian: boolean;
  onMuteUser: (messageId: string | number) => void;
  onDeleteMessage: (messageId: string | number) => void;
  onReplyToMessage: (message: { id: number; content: string; username: string }) => void;
  profanityFilter?: boolean;
}

// Simple profanity filter function
function filterProfanity(text: string): string {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
  const profanityWords = [
    'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'crap', 'piss', 'cock', 'dick',
    'bastard', 'whore', 'slut', 'cunt', 'fag', 'nigger', 'retard', 'gay', 'homo'
  ];
  
  let filteredText = text;
  profanityWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filteredText = filteredText.replace(regex, '#'.repeat(word.length));
  });
  
  return filteredText;
}

export default function ChatContainer({ 
  messages, 
  isGuardian, 
  onMuteUser, 
  onDeleteMessage, 
  onReplyToMessage,
  profanityFilter = false 
}: ChatContainerProps) {
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getTimeUntilDelete = (expiresAt?: string) => {
    if (!expiresAt) return '';
    const expires = new Date(expiresAt);
    const now = new Date();
    
    if (isNaN(expires.getTime())) return '';
    if (expires <= now) return 'expired';
    
    return formatDistanceToNow(expires, { addSuffix: false }) + ' left';
  };

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleLongPressStart = (message: any) => {
    const timer = setTimeout(() => {
      onReplyToMessage({
        id: message.id,
        content: message.content,
        username: message.username
      });
      navigator.vibrate?.(50); // Haptic feedback
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-2 pb-4">
      {messages.filter(message => 
        message.content && 
        typeof message.content === 'string' && 
        message.content.trim().length > 0
      ).map((message, index) => (
        <div 
          key={message.id || `message-${index}-${Date.now()}`} 
          className="message-bubble group"
          style={{
            backgroundColor: 'var(--bubble)',
            borderRadius: '10px',
            padding: '8px 12px',
            marginBottom: '12px',
            border: '1px solid var(--input-border)',
            maxWidth: '90%',
            fontSize: '14px',
            lineHeight: '1.4'
          }}
          onTouchStart={() => handleLongPressStart(message)}
          onTouchEnd={handleLongPressEnd}
          onMouseDown={() => handleLongPressStart(message)}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
        >
          {/* Message Header: Username and Timestamp */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              {/* Username - Bold Green */}
              <span 
                className="font-bold font-mono"
                style={{ 
                  color: 'var(--username-color)',
                  fontSize: '13px'
                }}
              >
                {message.username}
              </span>
              
              {/* Guardian Controls - Inline with username */}
              {isGuardian && message.username !== 'system' && !message.isAd && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMuteUser(message.id)}
                    className="text-red-400 hover:text-red-500 text-xs p-1 h-auto"
                    title="Mute IP"
                  >
                    <Volume className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteMessage(message.id)}
                    className="text-red-400 hover:text-red-500 text-xs p-1 h-auto"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Timestamp - Right Aligned Gray */}
            <span 
              className="font-mono"
              style={{ 
                color: 'var(--timestamp-color)',
                fontSize: '11px'
              }}
            >
              {formatTime(message.createdAt || message.timestamp)}
            </span>
          </div>
          
          {/* Expiry Notice - Below Username */}
          {message.expiresAt && (
            <div 
              className="font-mono mb-2"
              style={{ 
                color: 'var(--expiry-color)',
                fontSize: '11px'
              }}
            >
              [{getTimeUntilDelete(message.expiresAt)}]
            </div>
          )}
          
          {/* Message Content - Light White Text */}
          <div 
            className={`font-mono break-words ${
              message.isAd 
                ? 'italic opacity-60' 
                : message.username === 'system'
                ? 'italic'
                : ''
            }`}
            style={{ 
              color: message.username === 'system' ? 'var(--system-color)' : 'var(--text)',
              fontSize: '14px',
              lineHeight: '1.4'
            }}
          >
            {profanityFilter ? filterProfanity(message.content) : message.content}
          </div>
          
          {/* Ad-specific content */}
          {message.isAd && message.productName && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-xs font-mono" style={{ color: '#888' }}>
                <span className="font-semibold">{message.productName}</span>
                {message.description && (
                  <div className="mt-1">{message.description}</div>
                )}
                {message.url && (
                  <div className="mt-1">
                    <a 
                      href={message.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      Learn more
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
