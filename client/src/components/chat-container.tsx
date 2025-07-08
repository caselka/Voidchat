import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Volume, Trash2, Shield } from "lucide-react";
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

interface ExtendedChatContainerProps extends ChatContainerProps {
  isAtBottom?: boolean;
  setIsAtBottom?: (value: boolean) => void;
}

export default function ChatContainer({ 
  messages, 
  isGuardian, 
  onMuteUser, 
  onDeleteMessage, 
  onReplyToMessage,
  profanityFilter = false,
  isAtBottom = true,
  setIsAtBottom 
}: ExtendedChatContainerProps) {
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

  // Auto-scroll to bottom effect
  useEffect(() => {
    if (messages.length > 0 && isAtBottom) {
      const container = document.querySelector('.messages-container');
      if (container) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 50);
      }
    }
  }, [messages, isAtBottom]);

  // Check if user is at bottom for auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const threshold = 100;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    
    if (setIsAtBottom) {
      setIsAtBottom(isNearBottom);
    }
  };

  return (
    <>
      {messages.length === 0 ? (
        <div className="loading-message">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div key={message.id || `message-${index}-${Date.now()}`} className="message-item">
            <div className="message-header">
              <div className="flex items-center space-x-2">
                <span className={`message-username ${
                  message.type === 'ad' || message.isAd
                    ? 'text-amber-400'
                    : message.username === 'system' || message.username === 'System'
                    ? 'text-red-400'
                    : ''
                }`}>
                  {message.username}
                  {(message.type === 'ad' || message.isAd) && <span className="ml-1 text-xs opacity-70">(sponsor)</span>}
                </span>
                {message.isGuardian && (
                  <Shield className="w-3 h-3 text-green-400" />
                )}
              </div>
              <span className="message-time">
                {formatTime(message.createdAt || message.timestamp)}
              </span>
            </div>
            <p className="message-content">
              {profanityFilter ? filterProfanity(message.content) : message.content}
            </p>
            {(message.type === 'ad' || message.isAd) && message.url && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <a 
                  href={message.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                >
                  Learn more →
                </a>
              </div>
            )}
            {isGuardian && message.username !== 'system' && message.username !== 'System' && !message.isAd && message.type !== 'ad' && (
              <div className="message-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMuteUser(message.id)}
                  className="text-xs"
                >
                  <Volume className="w-3 h-3 mr-1" />
                  Mute User
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteMessage(message.id)}
                  className="text-xs text-red-400"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}
