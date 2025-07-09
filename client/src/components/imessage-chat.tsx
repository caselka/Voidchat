import { useEffect, useState, useRef, useMemo } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  content: string;
  username: string;
  timestamp: string;
  expiresAt?: string;
  replyToId?: number;
}

interface iMessageChatProps {
  className?: string;
}

export default function iMessageChat({ className }: iMessageChatProps) {
  const { messages, isConnected, sendMessage, rateLimitTime } = useWebSocket();
  const { user, isAuthenticated } = useAuth();
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    
    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  // Group consecutive messages from same user
  const groupedMessages = useMemo(() => {
    const groups: Array<{
      username: string;
      messages: Message[];
      timestamp: string;
    }> = [];

    messages.forEach((message) => {
      const lastGroup = groups[groups.length - 1];
      const timeDiff = lastGroup 
        ? new Date(message.timestamp).getTime() - new Date(lastGroup.timestamp).getTime()
        : Infinity;

      // Group if same user and within 2 minutes
      if (lastGroup && lastGroup.username === message.username && timeDiff < 120000) {
        lastGroup.messages.push(message);
        lastGroup.timestamp = message.timestamp; // Update to latest timestamp
      } else {
        groups.push({
          username: message.username,
          messages: [message],
          timestamp: message.timestamp,
        });
      }
    });

    return groups;
  }, [messages]);

  // Generate user avatar color based on username
  const getUserColor = (username: string) => {
    const colors = [
      "from-blue-500 to-purple-600",
      "from-green-500 to-teal-600", 
      "from-pink-500 to-rose-600",
      "from-orange-500 to-red-600",
      "from-indigo-500 to-blue-600",
      "from-purple-500 to-pink-600",
      "from-teal-500 to-green-600",
      "from-yellow-500 to-orange-600",
    ];
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Handle message sending
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isConnected || isTyping) return;

    setIsTyping(true);
    try {
      await sendMessage(inputMessage.trim());
      setInputMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3">
          {groupedMessages.map((group, groupIndex) => (
            <div key={`${group.username}-${groupIndex}`} className="flex items-end space-x-2">
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white shadow-md"
                   style={{
                     background: `linear-gradient(135deg, ${getUserColor(group.username).replace('from-', '').replace(' to-', ', ')})`,
                   }}>
                {group.username.charAt(0).toUpperCase()}
              </div>
              
              {/* Message Group */}
              <div className="flex-1 max-w-[75%]">
                {/* Username (only show once per group) */}
                <div className="text-xs font-medium text-muted-foreground mb-1 px-1">
                  {group.username}
                </div>
                
                {/* Messages in this group */}
                <div className="space-y-1">
                  {group.messages.map((message, messageIndex) => (
                    <div
                      key={message.id}
                      className={cn(
                        "bg-muted/60 rounded-2xl px-3 py-2 shadow-sm",
                        messageIndex === 0 && "rounded-tl-md", // First message gets square corner
                        messageIndex === group.messages.length - 1 && "rounded-bl-md" // Last message gets square corner
                      )}
                    >
                      <div className="text-sm text-foreground leading-relaxed break-words">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Timestamp (only show for the last message in group) */}
                <div className="text-[10px] text-muted-foreground mt-1 px-1">
                  {formatTime(group.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-center space-x-2 px-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              </div>
              <div className="bg-muted/60 rounded-2xl rounded-bl-md px-3 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm p-3">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message..."
              disabled={!isConnected || isTyping || (rateLimitTime && rateLimitTime > 0)}
              className="rounded-full bg-muted/50 border-0 pl-4 pr-12 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
              style={{ fontSize: "16px" }} // Prevent zoom on iOS
            />
            
            {/* Rate limit indicator */}
            {rateLimitTime && rateLimitTime > 0 && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <span className="text-xs text-muted-foreground">
                  {rateLimitTime}s
                </span>
              </div>
            )}
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !isConnected || isTyping || (rateLimitTime && rateLimitTime > 0)}
            size="sm"
            className="rounded-full w-8 h-8 p-0 bg-primary hover:bg-primary/90"
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Connection status */}
        {!isConnected && (
          <div className="text-xs text-muted-foreground text-center mt-2">
            Connecting...
          </div>
        )}
      </div>
    </div>
  );
}