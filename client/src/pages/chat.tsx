import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import ChatContainer from "@/components/chat-container";
import MessageInput from "@/components/message-input";
import GuardianPanel from "@/components/guardian-panel";
import HumanVerification from "@/components/human-verification";
import Walkthrough from "@/components/walkthrough";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MoreVertical, Shield, Megaphone, Info, User, Palette, LogIn, LogOut, Users, Plus, Box } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import type { Room } from "@shared/schema";

export default function Chat() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { messages, isConnected, isGuardian, currentUser, onlineCount, sendMessage, muteUser, deleteMessage, enableSlowMode, error, rateLimitTime } = useWebSocket();
  const [profanityFilter, setProfanityFilter] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: number; content: string; username: string } | null>(null);
  const [globalCooldown, setGlobalCooldown] = useState<{ active: boolean; timeLeft: number; reason: string } | null>(null);

  // Fetch rooms for dropdown
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['/api/rooms'],
    enabled: true,
  });

  // Check if user is new (for walkthrough)
  useEffect(() => {
    if (!isAuthenticated) {
      const hasSeenWalkthrough = localStorage.getItem('voidchat-walkthrough-seen');
      if (!hasSeenWalkthrough) {
        setShowWalkthrough(true);
      }
    }
  }, [isAuthenticated]);

  const handleWalkthroughComplete = () => {
    setShowWalkthrough(false);
    localStorage.setItem('voidchat-walkthrough-seen', 'true');
  };

  const handleWalkthroughSkip = () => {
    setShowWalkthrough(false);
    localStorage.setItem('voidchat-walkthrough-seen', 'true');
  };

  const RoomsList = () => {
    if (roomsLoading) {
      return <DropdownMenuItem disabled>Loading rooms...</DropdownMenuItem>;
    }
    
    if (rooms.length === 0) {
      return <DropdownMenuItem disabled>No rooms available</DropdownMenuItem>;
    }
    
    return (
      <>
        {rooms.map((room: Room) => (
          <DropdownMenuItem key={room.id} asChild>
            <Link href={`/room/${room.name}`} className="flex items-center">
              <Box className="w-4 h-4 mr-2" />
              {room.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </>
    );
  };

  // Check if user needs human verification (anonymous users only)
  const needsVerification = !isAuthenticated && !isHumanVerified;

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
    // Auto-scroll to bottom when new messages arrive
    if (isConnected && messages.length > 0) {
      // Delay scroll to prevent input movement
      setTimeout(() => {
        const body = document.body;
        const html = document.documentElement;
        const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
        
        window.scrollTo({
          top: height,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages, isConnected]);

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
      {/* Human Verification Modal for Anonymous Users */}
      {needsVerification && (
        <HumanVerification onVerified={() => setIsHumanVerified(true)} />
      )}
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[9999] bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-[120px]">
            <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground hidden sm:inline">
              {isConnected ? `${onlineCount} online` : 'Connecting...'}
            </span>

            {/* Rooms Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                  title="Browse rooms"
                  data-walkthrough="rooms-button"
                >
                  <Box className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Rooms</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/create-room" className="flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Room
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <RoomsList />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              data-walkthrough="theme-toggle"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
          </div>
          
          <h1 className="text-lg md:text-xl font-light tracking-wider text-foreground">voidchat</h1>
          
          <div className="flex items-center space-x-2 min-w-[120px] justify-end">
            {/* Profanity Filter Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProfanityFilter(!profanityFilter)}
              className={`p-2 transition-colors ${
                profanityFilter 
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                  : 'hover:bg-void-200 dark:hover:bg-void-700 text-void-700 dark:text-void-300'
              }`}
              title="Hide profanity"
              data-walkthrough="profanity-filter"
            >
              {profanityFilter ? '***' : '@#$'}
            </Button>


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
            {!isLoading && (isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Logout error:', error);
                    window.location.href = '/';
                  }
                }}
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
            ))}
            
            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="p-2 rounded-lg hover:bg-void-200 dark:hover:bg-void-700 transition-colors text-void-700 dark:text-void-300"
                  data-walkthrough="menu-button"
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
                <DropdownMenuItem asChild>
                  <Link href="/create-room" className="flex items-center text-void-700 dark:text-void-300 hover:text-void-900 dark:hover:text-void-100">
                    <Users className="w-4 h-4 mr-2 text-purple-500" />
                    Create Room ($49)
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
                <DropdownMenuItem asChild>
                  <Link href="/about" className="flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    About Voidchat
                  </Link>
                </DropdownMenuItem>
                {isAuthenticated && (
                  <>
                    <DropdownMenuSeparator className="border-void-300 dark:border-void-600" />
                    <DropdownMenuItem asChild>
                      <Link href="/member-settings" className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Member Settings
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Guardian Panel */}
      {isGuardian && (
        <GuardianPanel onEnableSlowMode={enableSlowMode} />
      )}

      {/* Main Content - Full Height Scrollable */}
      <main 
        className="max-w-4xl mx-auto px-3 md:px-4 relative z-10 chat-main-container"
        style={{
          minHeight: '100vh',
          paddingTop: '80px',
          paddingBottom: '70px',
          position: 'relative'
        }}
      >
        {/* Welcome Message */}
        <div className="text-center py-4 font-mono" style={{ color: 'var(--welcome-text)', fontSize: '12px' }}>
          <p>Welcome to the void. Messages vanish after 15 minutes.</p>
          {currentUser && (
            <p className="mt-1">You are <span style={{ color: 'var(--username-color)' }}>{currentUser}</span></p>
          )}
          {/* Online count for mobile */}
          <p className="mt-1 sm:hidden" style={{ fontSize: '11px' }}>
            {isConnected ? `${onlineCount} online` : 'Connecting...'}
          </p>
        </div>

        {/* Chat Container */}
        <div className="chat-container">
          <ChatContainer 
            messages={messages}
            isGuardian={isGuardian}
            onMuteUser={muteUser}
            onDeleteMessage={deleteMessage}
            onReplyToMessage={() => {}}
            profanityFilter={profanityFilter}
          />
        </div>
      </main>

      {/* Message Input - Fixed at bottom with proper keyboard handling */}
      <MessageInput 
        onSendMessage={sendMessage}
        rateLimitTime={rateLimitTime}
        error={error}
      />

      {/* Walkthrough */}
      <Walkthrough
        isVisible={showWalkthrough}
        onComplete={handleWalkthroughComplete}
        onSkip={handleWalkthroughSkip}
      />
    </div>
  );
}
