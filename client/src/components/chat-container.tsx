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
  currentUser?: string;
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
  profanityFilter = false,
  currentUser
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

  // Use the passed currentUser prop

  // Helper function to get avatar initials
  const getAvatarInitials = (username: string) => {
    if (username === 'system') return 'SYS';
    if (username.startsWith('anon')) return 'A';
    return username.charAt(0).toUpperCase();
  };

  // Helper function to determine if message should be compact
  const shouldCompact = (currentMessage: any, previousMessage: any) => {
    if (!previousMessage) return false;
    const current = currentMessage.data || currentMessage;
    const previous = previousMessage.data || previousMessage;
    
    // Same user and within 5 minutes
    if (current.username === previous.username) {
      const currentTime = new Date(current.createdAt || current.timestamp);
      const previousTime = new Date(previous.createdAt || previous.timestamp);
      const timeDiff = Math.abs(currentTime.getTime() - previousTime.getTime());
      return timeDiff < 5 * 60 * 1000; // 5 minutes
    }
    return false;
  };

  return (
    <div className="w-full pb-4">
      {filteredMessages.map((message, index) => {
        // Handle both direct message format and wrapped format
        const messageData = message.data || message;
        const isOwnMessage = currentUser && messageData.username === currentUser;
        const isSystemMessage = messageData.username === 'system';
        const previousMessage = index > 0 ? filteredMessages[index - 1] : null;
        const isCompact = shouldCompact(message, previousMessage) && !isSystemMessage;
        
        return (
        <div 
          key={messageData.id || `message-${index}-${Date.now()}`} 
          className={`message-bubble message-fade-in group ${
            isOwnMessage ? 'own-message' : isSystemMessage ? 'system-message' : 'other-message'
          } ${isCompact ? 'compact' : ''}`}
          onTouchStart={() => handleLongPressStart(messageData)}
          onTouchEnd={handleLongPressEnd}
          onMouseDown={() => handleLongPressStart(messageData)}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
        >
          {isSystemMessage ? (
            /* System message layout */
            <div className="message-wrapper">
              <div className="message-content message-text">
                {profanityFilter ? filterProfanity(messageData.content) : messageData.content}
              </div>
            </div>
          ) : (
            /* Regular message layout */
            <div className="message-wrapper">
              {/* Message content wrapper - no avatars */}
              <div className="message-content-wrapper">
                {/* Message header with timer */}
                {!isCompact && (
                  <div className="message-header">
                    <span className="message-username message-metadata">
                      {messageData.username}
                    </span>
                    <span className="message-timestamp message-metadata">
                      {formatTime(messageData.createdAt || messageData.timestamp)}
                    </span>
                    {/* Message timer */}
                    <span className="message-timer text-xs opacity-60">
                      {getTimeUntilDelete(messageData.expiresAt)}
                    </span>
                  </div>
                )}
                
                {/* Message content */}
                <div className="message-content message-text">
                  {profanityFilter ? filterProfanity(messageData.content) : messageData.content}
                </div>
                
                {/* Ad-specific content */}
                {messageData.isAd && messageData.productName && (
                  <div className="mt-2 pt-2 border-t border-muted">
                    <div className="text-xs">
                      <span className="font-semibold">{messageData.productName}</span>
                      {messageData.description && (
                        <div className="mt-1 text-muted-foreground">{messageData.description}</div>
                      )}
                      {messageData.url && (
                        <div className="mt-1">
                          <a 
                            href={messageData.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Learn more
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Guardian Controls */}
              {isGuardian && !messageData.isAd && !isOwnMessage && (
                <div className="message-controls">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMuteUser(messageData.id)}
                    className="text-red-400 hover:text-red-500 p-1 h-auto"
                    title="Mute IP"
                  >
                    <Volume className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteMessage(messageData.id)}
                    className="text-red-400 hover:text-red-500 p-1 h-auto"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
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
