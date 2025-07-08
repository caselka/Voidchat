import { useState } from "react";
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
              className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 select-none ${
                message.isAd 
                  ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 italic text-amber-800 dark:text-amber-200' 
                  : message.username === 'system'
                  ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 italic'
                  : 'bg-muted/50 hover:bg-muted/70 border border-border/50'
              }`}
              onTouchStart={() => handleLongPressStart(message)}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(message)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
            >
              {/* Reply indicator */}
              {message.replyToId && (
                <div className="mb-2 pl-3 border-l-2 border-blue-500 text-xs text-muted-foreground">
                  <span className="text-blue-600 dark:text-blue-400">↳ Reply</span>
                </div>
              )}
              
              <div className="text-sm md:text-base leading-relaxed break-words">
                {profanityFilter ? filterProfanity(message.content) : message.content}
              </div>
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
    </div>
  );
}
