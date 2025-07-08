import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { useTheme } from "@/components/theme-provider";
import ChatContainer from "@/components/chat-container";
import MessageInput from "@/components/message-input";
import GuardianPanel from "@/components/guardian-panel";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MoreVertical, Shield, Megaphone, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Chat() {
  const { theme, toggleTheme } = useTheme();
  const { messages, isConnected, isGuardian, sendMessage, muteUser, deleteMessage, enableSlowMode, error, rateLimitTime } = useWebSocket();
  const [currentUser] = useState(`anon${Math.floor(Math.random() * 9999)}`);
  const [onlineCount] = useState(Math.floor(Math.random() * 50) + 20);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages]);

  return (
    <div className="font-sans bg-void-50 dark:bg-void-900 text-void-800 dark:text-void-200 transition-colors duration-300 min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-void-50/95 dark:bg-void-900/95 backdrop-blur-sm border-b border-void-300 dark:border-void-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            <h1 className="text-lg md:text-xl font-light tracking-wider text-void-900 dark:text-void-100">voidchat</h1>
            <span className="text-xs px-2 py-1 bg-void-200 dark:bg-void-700 rounded text-void-600 dark:text-void-400 hidden sm:inline">
              {isConnected ? `${onlineCount} online` : 'Connecting...'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Guardian Status */}
            {isGuardian && (
              <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Guardian</span>
              </span>
            )}
            
            {/* Rate Limit Indicator */}
            {rateLimitTime > 0 && (
              <div className="text-xs text-void-500 dark:text-void-400">
                {rateLimitTime}s
              </div>
            )}
            
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-void-200 dark:hover:bg-void-700 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-3 h-3 md:w-4 md:h-4" /> : <Moon className="w-3 h-3 md:w-4 md:h-4" />}
            </Button>
            
            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="p-2 rounded-lg hover:bg-void-200 dark:hover:bg-void-700 transition-colors"
                >
                  <MoreVertical className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-white dark:bg-void-800 border-void-300 dark:border-void-600">
                <DropdownMenuItem asChild>
                  <Link href="/guardian" className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-green-500" />
                    Become Guardian ($2/day)
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/sponsor" className="flex items-center">
                    <Megaphone className="w-4 h-4 mr-2 text-blue-500" />
                    Sponsor the Room
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-void-300 dark:border-void-600" />
                <DropdownMenuItem className="text-void-600 dark:text-void-400">
                  <Info className="w-4 h-4 mr-2" />
                  About Voidchat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Guardian Panel */}
      {isGuardian && (
        <GuardianPanel onEnableSlowMode={enableSlowMode} />
      )}

      {/* Main Content */}
      <main className="pt-20 pb-28 max-w-4xl mx-auto px-3 md:px-4">
        <div className="min-h-screen">
          {/* Welcome Message */}
          <div className="text-center py-6 md:py-8 text-void-500 dark:text-void-400 text-xs md:text-sm font-mono">
            <p>Welcome to the void. Messages vanish after 15 minutes.</p>
            <p className="mt-1">You are <span className="text-void-700 dark:text-void-300">{currentUser}</span></p>
            {/* Online count for mobile */}
            <p className="mt-1 sm:hidden text-xs">
              {isConnected ? `${onlineCount} online` : 'Connecting...'}
            </p>
          </div>

          {/* Chat Container */}
          <ChatContainer 
            messages={messages}
            isGuardian={isGuardian}
            onMuteUser={muteUser}
            onDeleteMessage={deleteMessage}
          />
        </div>
      </main>

      {/* Message Input */}
      <MessageInput 
        onSendMessage={sendMessage}
        rateLimitTime={rateLimitTime}
        error={error}
      />
    </div>
  );
}
