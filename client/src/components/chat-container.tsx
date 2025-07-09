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

  const filteredMessages = messages.filter(message => {
    // Handle both direct message format and wrapped format
    const content = message.content || message.data?.content;
    return content && 
           typeof content === 'string' && 
           content.trim().length > 0;
  });

  return (
    <div className="space-y-2 pb-4">
      {filteredMessages.map((message, index) => {
        // Handle both direct message format and wrapped format
        const messageData = message.data || message;
        return (
        <div 
          key={messageData.id || `message-${index}-${Date.now()}`} 
          className="message-bubble group"
          style={{
            padding: '8px 0',
            marginBottom: '4px',
            maxWidth: '100%',
            fontSize: '14px',
            lineHeight: '1.4'
          }}
          onTouchStart={() => handleLongPressStart(messageData)}
          onTouchEnd={handleLongPressEnd}
          onMouseDown={() => handleLongPressStart(messageData)}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
        >
          {/* Message Header: Username and Timestamp */}
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              {/* Username - Bold Green */}
              <span 
                className="font-bold font-mono"
                style={{ 
                  color: 'var(--username-color)',
                  fontSize: '13px'
                }}
              >
                {messageData.username}
              </span>
              
              {/* Guardian Controls - Inline with username */}
              {isGuardian && messageData.username !== 'system' && !messageData.isAd && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMuteUser(messageData.id)}
                    className="text-red-400 hover:text-red-500 text-xs p-1 h-auto"
                    title="Mute IP"
                  >
                    <Volume className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteMessage(messageData.id)}
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
              {formatTime(messageData.createdAt || messageData.timestamp)}
            </span>
          </div>
          
          {/* Expiry Notice - Below Username */}
          {messageData.expiresAt && (
            <div 
              className="font-mono mb-1"
              style={{ 
                color: 'var(--expiry-color)',
                fontSize: '11px'
              }}
            >
              [{getTimeUntilDelete(messageData.expiresAt)}]
            </div>
          )}
          
          {/* Message Content - Light White Text */}
          <div 
            className={`font-mono break-words ${
              messageData.isAd 
                ? 'italic opacity-60' 
                : messageData.username === 'system'
                ? 'italic'
                : ''
            }`}
            style={{ 
              color: messageData.username === 'system' ? 'var(--system-color)' : 'var(--text)',
              fontSize: '14px',
              lineHeight: '1.4'
            }}
          >
            {profanityFilter ? filterProfanity(messageData.content) : messageData.content}
          </div>
          
          {/* Ad-specific content */}
          {messageData.isAd && messageData.productName && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-xs font-mono" style={{ color: '#888' }}>
                <span className="font-semibold">{messageData.productName}</span>
                {messageData.description && (
                  <div className="mt-1">{messageData.description}</div>
                )}
                {messageData.url && (
                  <div className="mt-1">
                    <a 
                      href={messageData.url} 
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
        );
      })}
      
      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
