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

export default function ChatMobile() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { messages, isConnected, isGuardian, currentUser, onlineCount, sendMessage, muteUser, deleteMessage, enableSlowMode, error, rateLimitTime } = useWebSocket();
  const [profanityFilter, setProfanityFilter] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

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

  const needsVerification = !isAuthenticated && !isHumanVerified;

  const toggleProfanityFilter = () => {
    setProfanityFilter(!profanityFilter);
  };

  // Show connection status
  if (!isConnected) {
    return (
      <div className="chat-layout">
        <div className="loading-message">
          <div className="animate-pulse">connecting to the void...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      {showWalkthrough && (
        <Walkthrough
          isVisible={showWalkthrough}
          onComplete={handleWalkthroughComplete}
          onSkip={handleWalkthroughSkip}
        />
      )}
      
      {needsVerification ? (
        <HumanVerification onVerified={() => setIsHumanVerified(true)} />
      ) : (
        <>
          {/* Header */}
          <header className="chat-header">
            {/* Left side - Rooms button */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Box className="w-5 h-5 text-purple-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <div className="p-2">
                    <h4 className="font-medium text-sm mb-2">Chat Rooms</h4>
                    {roomsLoading ? (
                      <div className="text-xs text-muted-foreground">Loading...</div>
                    ) : rooms.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No rooms available</div>
                    ) : (
                      <div className="space-y-1">
                        {rooms.map((room: Room) => (
                          <Link key={room.id} href={`/room/${room.name}`}>
                            <div className="text-xs hover:bg-accent rounded p-1 cursor-pointer">
                              #{room.name}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    <Link href="/rooms">
                      <DropdownMenuItem className="text-xs">
                        <Plus className="w-3 h-3 mr-2" />
                        Create Room ($49)
                      </DropdownMenuItem>
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Center - Title and status */}
            <div className="flex-1 text-center">
              <h1>voidchat</h1>
              <div className="online-indicator">
                <div className={`online-dot ${!isConnected ? 'bg-red-500' : ''}`}></div>
                <span>{isConnected ? 'connected' : 'disconnected'}</span>
                {onlineCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{onlineCount} online</span>
                  </>
                )}
              </div>
            </div>

            {/* Right side - Controls */}
            <div className="header-controls">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={toggleProfanityFilter}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Megaphone className="w-4 h-4 mr-2" />
                      Profanity Filter
                    </span>
                    <div className={`w-8 h-4 rounded-full transition-colors ${profanityFilter ? 'bg-blue-500' : 'bg-gray-300'} relative`}>
                      <div 
                        className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${profanityFilter ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!isLoading && (
                    <>
                      {isAuthenticated ? (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href="/member-settings">
                              <User className="w-4 h-4 mr-2" />
                              Account Settings
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/api/logout">
                              <LogOut className="w-4 h-4 mr-2" />
                              Sign Out
                            </Link>
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem asChild>
                          <Link href="/api/login">
                            <LogIn className="w-4 h-4 mr-2" />
                            Sign In
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/guardian">
                      <Shield className="w-4 h-4 mr-2" />
                      Guardian ($20/day)
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/handle">
                      <User className="w-4 h-4 mr-2" />
                      Custom Handle
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/themes">
                      <Palette className="w-4 h-4 mr-2" />
                      Themes
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/sponsor">
                      <Megaphone className="w-4 h-4 mr-2" />
                      Sponsor Ads
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/about">
                      <Info className="w-4 h-4 mr-2" />
                      About
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Chat Messages Container */}
          <main className="messages-container auto-scroll">
            <ChatContainer 
              messages={messages}
              isGuardian={isGuardian}
              onMuteUser={muteUser}
              onDeleteMessage={deleteMessage}
              onReplyToMessage={() => {}}
              profanityFilter={profanityFilter}
              isAtBottom={isAtBottom}
              setIsAtBottom={setIsAtBottom}
            />
          </main>

          {/* Guardian Panel */}
          {isGuardian && (
            <GuardianPanel onEnableSlowMode={enableSlowMode} />
          )}

          {/* Fixed Input Container */}
          <div className="input-container">
            <MessageInput 
              onSendMessage={sendMessage}
              rateLimitTime={rateLimitTime}
              error={error}
            />
          </div>
        </>
      )}
    </div>
  );
}