import { useState, useEffect, useRef, useCallback } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Smart scroll to bottom with user awareness
  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  }, [isNearBottom]);

  // Throttled scroll handler for performance
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 150;
    
    setIsNearBottom(nearBottom);
    setShowScrollButton(distanceFromBottom > 300);
  }, []);

  // Debounced scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;
    const debouncedHandler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 16); // ~60fps
    };

    container.addEventListener('scroll', debouncedHandler, { passive: true });
    return () => {
      container.removeEventListener('scroll', debouncedHandler);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  // Auto-scroll for new messages when user is at bottom
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to allow DOM updates
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, scrollToBottom]);
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

  return (
    <div className="space-y-3 pb-4">
      {messages.map((message, index) => (
        <div key={message.id || `message-${index}-${Date.now()}`} className="flex items-start space-x-2 md:space-x-3 group">
          {/* Timestamp */}
          <div className="text-xs text-muted-foreground w-12 md:w-16 flex-shrink-0 pt-1 font-mono">
            {formatTime(message.createdAt || message.timestamp)}
          </div>
          
          {/* Message Content */}
          <div className="flex-1">
            {message.username !== 'system' && (
              <div className="text-xs text-muted-foreground mb-1">
                <span className="font-mono">{message.username}</span>
                {message.expiresAt && (
                  <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getTimeUntilDelete(message.expiresAt)}
                  </span>
                )}
              </div>
            )}
            
            <div 
              className={`font-mono text-xs md:text-sm leading-relaxed break-words ${
                message.isAd 
                  ? 'italic text-void-600 dark:text-void-500 opacity-60' 
                  : message.username === 'system'
                  ? 'text-blue-600 dark:text-blue-400 italic'
                  : ''
              }`}
            >
              {profanityFilter ? filterProfanity(message.content) : message.content}
            </div>
          </div>
          
          {/* Guardian Controls */}
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
      ))}
      
      {/* Scroll anchor for auto-scroll */}
      <div ref={messagesEndRef} className="h-1" />
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="fixed bottom-24 right-4 z-10">
          <Button
            onClick={() => scrollToBottom(true)}
            className="h-10 w-10 p-0 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg border-0"
            size="sm"
          >
            ↓
          </Button>
        </div>
      )}
    </div>
  );
}
