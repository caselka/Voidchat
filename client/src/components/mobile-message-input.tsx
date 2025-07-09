import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Plus, Camera, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileMessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
  rateLimitTime?: number;
  className?: string;
}

export default function MobileMessageInput({ 
  onSendMessage, 
  disabled = false, 
  rateLimitTime = 0,
  className 
}: MobileMessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || isTyping || disabled || rateLimitTime > 0) return;
    
    const messageToSend = message.trim();
    setMessage("");
    setIsTyping(true);
    
    try {
      await onSendMessage(messageToSend);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore message on error
      setMessage(messageToSend);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = message.trim() && !isTyping && !disabled && rateLimitTime === 0;

  return (
    <div className={cn(
      "bg-background/95 backdrop-blur-sm border-t border-border/50 p-3 safe-area-inset-bottom",
      className
    )}>
      <div className="flex items-end space-x-2 max-w-2xl mx-auto">
        {/* Add attachment button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-8 h-8 rounded-full p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
          disabled={disabled}
        >
          <Plus className="w-5 h-5" />
        </Button>
        
        {/* Message input container */}
        <div className={cn(
          "flex-1 relative bg-muted/50 rounded-2xl transition-all duration-200",
          isFocused && "bg-muted/70 ring-1 ring-primary/30"
        )}>
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Message..."
            disabled={disabled || rateLimitTime > 0}
            rows={1}
            className="w-full bg-transparent border-0 resize-none px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
            style={{ 
              fontSize: "16px", // Prevent zoom on iOS
              lineHeight: "1.5",
              maxHeight: "120px"
            }}
          />
          
          {/* Rate limit indicator */}
          {rateLimitTime > 0 && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <span className="text-xs text-muted-foreground font-mono">
                {rateLimitTime}s
              </span>
            </div>
          )}
        </div>
        
        {/* Voice message button when empty */}
        {!message.trim() && !isTyping ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 rounded-full p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
            disabled={disabled}
          >
            <Mic className="w-5 h-5" />
          </Button>
        ) : (
          /* Send button */
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="sm"
            className={cn(
              "w-8 h-8 rounded-full p-0 flex-shrink-0 transition-all duration-200",
              canSend 
                ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" 
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
      
      {/* Connection status */}
      {disabled && (
        <div className="text-xs text-muted-foreground text-center mt-2">
          Connecting...
        </div>
      )}
    </div>
  );
}