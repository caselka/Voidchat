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
    filteredText = filteredText.replace(regex, '*'.repeat(word.length));
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
    
    // Calculate time remaining
    const msRemaining = expires.getTime() - now.getTime();
    const minutesRemaining = Math.floor(msRemaining / (1000 * 60));
    const secondsRemaining = Math.floor((msRemaining % (1000 * 60)) / 1000);
    
    if (minutesRemaining <= 0 && secondsRemaining <= 0) return 'expired';
    
    // Hide countdown for messages with unreasonably long expiration times (over 1 hour)
    // This handles old messages that were set to expire in 1 year
    if (minutesRemaining > 60) return '';
    
    if (minutesRemaining <= 0) return `${secondsRemaining}s`;
    return `${minutesRemaining}m ${secondsRemaining}s`;
  };

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{[key: string]: string}>({});

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

  // Smart scroll-to-bottom: only if user is already at bottom
  const chatRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // Filter messages first
  const filteredMessages = messages.filter(message => {
    // Handle both direct message format and wrapped format
    const content = message.content || message.data?.content;
    return content && 
           typeof content === 'string' && 
           content.trim().length > 0;
  });

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: {[key: string]: string} = {};
      filteredMessages.forEach(message => {
        const messageData = message.data || message;
        if (messageData.expiresAt) {
          newTimeRemaining[messageData.id] = getTimeUntilDelete(messageData.expiresAt);
        }
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [filteredMessages]);
  
  useEffect(() => {
    const container = document.querySelector('.chat-messages-area') as HTMLElement;
    if (!container) return;
    
    const checkIfAtBottom = () => {
      const threshold = 100;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      setIsAtBottom(isNearBottom);
    };
    
    checkIfAtBottom(); // Check immediately
    
    container.addEventListener('scroll', checkIfAtBottom);
    return () => container.removeEventListener('scroll', checkIfAtBottom);
  }, []);

  // Separate effect for auto-scrolling when new messages arrive
  useEffect(() => {
    const container = document.querySelector('.chat-messages-area') as HTMLElement;
    if (!container || !isAtBottom || messages.length === 0) return;
    
    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    });
  }, [messages, isAtBottom]);

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

  // Helper function to calculate dynamic spacing and padding based on message content
  const getDynamicSpacing = (messageData: any, isCompact: boolean) => {
    const contentLength = messageData.content?.length || 0;
    
    if (isCompact) return 'mb-1'; // Minimal spacing for compact messages
    if (contentLength < 20) return 'mb-2'; // Short messages get less space
    if (contentLength < 100) return 'mb-3'; // Medium messages
    return 'mb-4'; // Longer messages get more space
  };

  // Helper function to get dynamic padding based on content length
  const getDynamicPadding = (messageData: any, isCompact: boolean) => {
    const contentLength = messageData.content?.length || 0;
    
    if (isCompact) return { padding: '0.25rem 0.5rem' };
    if (contentLength < 10) return { padding: '0.375rem 0.625rem' }; // Very short
    if (contentLength < 50) return { padding: '0.5rem 0.75rem' }; // Short-medium
    if (contentLength < 150) return { padding: '0.625rem 0.875rem' }; // Medium
    return { padding: '0.75rem 1rem' }; // Long messages get more padding
  };

  return (
    <div 
      ref={chatRef}
      className="w-full pb-0 space-y-0 px-2 sm:px-4"
      style={{ 
        paddingBottom: '0px'
      }}
    >
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
          className={`message-bubble message-fade-in group max-w-lg mx-auto ${getDynamicSpacing(messageData, isCompact)} ${
            isOwnMessage ? 'own-message' : isSystemMessage ? 'system-message' : 'other-message'
          } ${isCompact ? 'compact' : ''} ${
            timeRemaining[messageData.id] === 'expired' ? 'opacity-30 animate-pulse' :
            timeRemaining[messageData.id]?.includes('0m') ? 'animate-shimmer' : ''
          }`}
          style={getDynamicPadding(messageData, isCompact)}
          onTouchStart={() => handleLongPressStart(messageData)}
          onTouchEnd={handleLongPressEnd}
          onMouseDown={() => handleLongPressStart(messageData)}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
        >
          {isSystemMessage ? (
            /* System message layout */
            <div className="message-wrapper">
              <div className="message-content message-text break-words whitespace-pre-wrap">
                {profanityFilter && typeof messageData.content === 'string' ? 
                  filterProfanity(messageData.content) : 
                  messageData.content}
              </div>
            </div>
          ) : (
            /* Regular message layout */
            <div className="message-wrapper">
              {/* Message content wrapper - no avatars */}
              <div className="message-content-wrapper">
                {/* Message header with timer */}
                {!isCompact && (
                  <div className="message-header mb-1">
                    <span className="message-username text-xs">
                      {messageData.username}
                    </span>
                    <span className="message-timestamp text-xs">
                      {formatTime(messageData.createdAt || messageData.timestamp)}
                    </span>
                    {/* Message timer */}
                    {getTimeUntilDelete(messageData.expiresAt) && (
                      <span className={`message-timer text-xs opacity-60 ml-2 ${
                        timeRemaining[messageData.id] === 'expired' ? 'animate-pulse text-red-400' : 
                        timeRemaining[messageData.id]?.includes('0m') ? 'text-orange-400 animate-pulse' : ''
                      }`}>
                        {timeRemaining[messageData.id] || getTimeUntilDelete(messageData.expiresAt)}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Message content - only filter message text, not usernames */}
                <div className="message-content message-text">
                  {profanityFilter && typeof messageData.content === 'string' ? 
                    filterProfanity(messageData.content) : 
                    messageData.content}
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
    </div>
  );
}
