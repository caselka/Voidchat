import { formatDistanceToNow } from "date-fns";
import { Volume, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/hooks/use-websocket";

interface ChatContainerProps {
  messages: Message[];
  isGuardian: boolean;
  onMuteUser: (messageId: string | number) => void;
  onDeleteMessage: (messageId: string | number) => void;
  profanityFilter?: boolean;
}

// Simple profanity filter function
function filterProfanity(text: string): string {
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

export default function ChatContainer({ messages, isGuardian, onMuteUser, onDeleteMessage, profanityFilter = false }: ChatContainerProps) {
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

  return (
    <div className="space-y-3">
      {messages.map((message, index) => (
        <div key={message.id || `message-${index}-${Date.now()}`} className="flex items-start space-x-2 md:space-x-3 group">
          {/* Timestamp */}
          <div className="text-xs text-void-400 dark:text-void-500 w-12 md:w-16 flex-shrink-0 pt-1 font-mono">
            {formatTime(message.timestamp)}
          </div>
          
          {/* Message Content */}
          <div className="flex-1">
            {message.username !== 'system' && (
              <div className="text-xs text-void-500 dark:text-void-400 mb-1">
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
    </div>
  );
}
