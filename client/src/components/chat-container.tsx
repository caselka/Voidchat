import { useState, useEffect, useRef, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Volume, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  // Group consecutive messages from same user for cleaner iMessage-style display
  const groupedMessages = useMemo(() => {
    const groups: Array<{
      username: string;
      messages: any[];
      timestamp: string;
    }> = [];

    filteredMessages.forEach((message) => {
      const messageData = message.data || message;
      const username = messageData.username || 'Anonymous';
      const timestamp = messageData.createdAt || messageData.timestamp;
      
      const lastGroup = groups[groups.length - 1];
      const timeDiff = lastGroup 
        ? new Date(timestamp).getTime() - new Date(lastGroup.timestamp).getTime()
        : Infinity;

      // Group if same user and within 2 minutes
      if (lastGroup && lastGroup.username === username && timeDiff < 120000) {
        lastGroup.messages.push(messageData);
        lastGroup.timestamp = timestamp;
      } else {
        groups.push({
          username,
          messages: [messageData],
          timestamp,
        });
      }
    });

    return groups;
  }, [filteredMessages]);

  // Generate user avatar color based on username
  const getUserColor = (username: string) => {
    const colors = [
      "#3B82F6", "#8B5CF6", "#EF4444", "#F59E0B", 
      "#10B981", "#06B6D4", "#F97316", "#84CC16"
    ];
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="px-3 py-2 pb-20">
      <div className="space-y-3">
        {groupedMessages.map((group, groupIndex) => (
          <div key={`${group.username}-${groupIndex}`} className="flex items-end space-x-2">
            {/* Avatar */}
            <div 
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white shadow-md"
              style={{
                backgroundColor: getUserColor(group.username),
              }}
            >
              {group.username.charAt(0).toUpperCase()}
            </div>
            
            {/* Message Group */}
            <div className="flex-1 max-w-[80%]">
              {/* Username (only show once per group) */}
              <div className="text-xs font-medium text-muted-foreground mb-1 px-1">
                {group.username}
              </div>
              
              {/* Messages in this group */}
              <div className="space-y-1">
                {group.messages.map((messageData, messageIndex) => {
                  const displayContent = profanityFilter ? filterProfanity(messageData.content) : messageData.content;
                  
                  return (
                    <div
                      key={messageData.id || `message-${messageIndex}`}
                      className={cn(
                        "bg-muted/60 rounded-2xl px-3 py-2.5 shadow-sm relative group transition-colors hover:bg-muted/70",
                        messageIndex === 0 && "rounded-tl-md", // First message gets square corner
                        messageIndex === group.messages.length - 1 && "rounded-bl-md" // Last message gets square corner
                      )}
                      onTouchStart={() => handleLongPressStart(messageData)}
                      onTouchEnd={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                    >
                      <div className="text-sm text-foreground leading-relaxed break-words">
                        {displayContent}
                      </div>
                      
                      {/* Expiration indicator */}
                      {messageData.expiresAt && (
                        <div className="text-[10px] text-orange-500/60 mt-1 flex items-center">
                          <Clock className="w-2.5 h-2.5 mr-1" />
                          {getTimeUntilDelete(messageData.expiresAt)}
                        </div>
                      )}
                      
                      {/* Ad-specific content */}
                      {messageData.isAd && messageData.productName && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <div className="text-xs">
                            <div className="font-semibold text-foreground">{messageData.productName}</div>
                            {messageData.description && (
                              <div className="text-muted-foreground mt-1">{messageData.description}</div>
                            )}
                            {messageData.url && (
                              <div className="mt-1">
                                <a 
                                  href={messageData.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  Learn more →
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Guardian controls */}
                      {isGuardian && messageData.username !== 'system' && !messageData.isAd && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onMuteUser(messageData.id)}
                              className="h-5 w-5 p-0 bg-background/80 hover:bg-destructive/20"
                              title="Mute user"
                            >
                              <Volume className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteMessage(messageData.id)}
                              className="h-5 w-5 p-0 bg-background/80 hover:bg-destructive/20"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Timestamp (only show for the last message in group) */}
              <div className="text-[10px] text-muted-foreground mt-1 px-1">
                {formatTime(group.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}
