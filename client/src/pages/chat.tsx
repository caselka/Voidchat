import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import ChatContainer from "@/components/chat-container";
import MessageInput from "@/components/message-input";
import GuardianPanel from "@/components/guardian-panel";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MoreVertical, Shield, Megaphone, Info, User, Palette, LogIn, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Chat() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { messages, isConnected, isGuardian, currentUser, onlineCount, sendMessage, muteUser, deleteMessage, enableSlowMode, error, rateLimitTime } = useWebSocket();
  const [profanityFilter, setProfanityFilter] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    // Check if user is at bottom
    const handleScroll = () => {
      const threshold = 100;
      const position = window.innerHeight + window.scrollY;
      const height = document.documentElement.scrollHeight;
      setIsAtBottom(position >= height - threshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom only when user is at bottom and new messages arrive
    if (isConnected && messages.length > 0 && isAtBottom) {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isConnected, isAtBottom]);

  // Show connection status
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">connecting to the void...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans bg-background text-foreground transition-colors duration-300 min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[9999] bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-[120px]">
            <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground hidden sm:inline">
              {isConnected ? `${onlineCount} online` : 'Connecting...'}
            </span>
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
          </div>
          
          <h1 className="text-lg md:text-xl font-light tracking-wider text-foreground">voidchat</h1>
          
          <div className="flex items-center space-x-2 min-w-[120px] justify-end">
            {/* Profanity Filter Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="profanity-filter"
                checked={profanityFilter}
                onChange={(e) => setProfanityFilter(e.target.checked)}
                className="sr-only"
              />
              <label
                htmlFor="profanity-filter"
                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                  profanityFilter 
                    ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                    : 'hover:bg-void-200 dark:hover:bg-void-700 text-void-700 dark:text-void-300'
                }`}
                title="Hide profanity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <circle cx="9" cy="9" r="0.5" fill="currentColor"/>
                  <circle cx="15" cy="9" r="0.5" fill="currentColor"/>
                </svg>
              </label>
            </div>
            {/* Guardian Status */}
            {isGuardian && (
              <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded flex items-center">
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
            

            
            {/* Login/Logout Button */}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                className="flex items-center space-x-1 text-xs"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1 text-xs"
                  title="Login"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
              </Link>
            )}
            
            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="p-2 rounded-lg hover:bg-void-200 dark:hover:bg-void-700 transition-colors text-void-700 dark:text-void-300"
                >
                  <MoreVertical className="w-3 h-3 md:w-4 md:h-4 text-void-700 dark:text-void-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-white dark:bg-void-800 border-void-300 dark:border-void-600 text-void-900 dark:text-void-100 z-50">
                <DropdownMenuItem asChild>
                  <Link href="/guardian-checkout" className="flex items-center text-void-700 dark:text-void-300 hover:text-void-900 dark:hover:text-void-100">
                    <Shield className="w-4 h-4 mr-2 text-green-500" />
                    Become Guardian ($20/day)
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/sponsor" className="flex items-center text-void-700 dark:text-void-300 hover:text-void-900 dark:hover:text-void-100">
                    <Megaphone className="w-4 h-4 mr-2 text-blue-500" />
                    Sponsor the Room
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-void-300 dark:border-void-600" />
                <DropdownMenuItem asChild>
                  <Link href="/handle" className="flex items-center text-void-700 dark:text-void-300 hover:text-void-900 dark:hover:text-void-100">
                    <User className="w-4 h-4 mr-2 text-purple-500" />
                    Custom Handle ($3)
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/themes" className="flex items-center text-void-700 dark:text-void-300 hover:text-void-900 dark:hover:text-void-100">
                    <Palette className="w-4 h-4 mr-2 text-pink-500" />
                    Custom Themes ($5)
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
      <main className="pt-20 pb-28 max-w-4xl mx-auto px-3 md:px-4 relative z-10">
        <div className="min-h-screen">
          {/* Welcome Message */}
          <div className="text-center py-6 md:py-8 text-void-500 dark:text-void-400 text-xs md:text-sm font-mono">
            <p>Welcome to the void. Messages vanish after 15 minutes.</p>
            {currentUser && (
              <p className="mt-1">You are <span className="text-void-700 dark:text-void-300">{currentUser}</span></p>
            )}
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
            profanityFilter={profanityFilter}
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
