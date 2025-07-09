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
import DynamicHeader from "@/components/dynamic-header";
import RoomsSidebar from "@/components/rooms-sidebar";
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
  const [showRoomsSidebar, setShowRoomsSidebar] = useState(false);

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
    // Auto-scroll to bottom when new messages arrive - simple approach
    if (isConnected && messages.length > 0) {
      // Use instant scroll to avoid input movement during animation
      requestAnimationFrame(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
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
      {/* Dynamic Header */}
      <DynamicHeader 
        title={`voidchat · ${onlineCount} online`}
        showRooms={true}
        onRoomsClick={() => setShowRoomsSidebar(true)}
      />
      
      {/* Rooms Sidebar */}
      <RoomsSidebar 
        isOpen={showRoomsSidebar}
        onClose={() => setShowRoomsSidebar(false)}
      />
      
      {/* Human Verification Modal for Anonymous Users */}
      {needsVerification && (
        <HumanVerification onVerified={() => setIsHumanVerified(true)} />
      )}
      
      {/* Chat Content */}
      <div className="pt-14 pb-20">
        <div className="max-w-2xl mx-auto px-3">
          <div className="text-center py-4">
            <h1 className="text-lg md:text-xl font-light tracking-wider text-foreground mb-2">voidchat</h1>
            <p className="text-xs text-muted-foreground">
              Welcome to the void. Messages vanish after 15 minutes.
            </p>
            {currentUser && (
              <p className="text-xs text-muted-foreground mt-1">
                You are <span className="text-foreground font-medium">{currentUser}</span>
              </p>
            )}
          </div>
          
          {/* Status indicators */}
          <div className="flex justify-center space-x-4 mt-2 text-xs">
            {/* Profanity Filter Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProfanityFilter(!profanityFilter)}
              className={`p-1 transition-colors ${
                profanityFilter 
                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Toggle profanity filter"
            >
              {profanityFilter ? '***' : '@#$'}
            </Button>

            {/* Guardian Status */}
            {isGuardian && (
              <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                Guardian
              </span>
            )}
            
            {/* Rate Limit Indicator */}
            {rateLimitTime > 0 && (
              <div className="text-xs text-muted-foreground">
                Cooldown: {rateLimitTime}s
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guardian Panel */}
      {isGuardian && (
        <GuardianPanel onEnableSlowMode={enableSlowMode} />
      )}

      {/* Chat Container */}
      <div className="max-w-2xl mx-auto px-3 pb-20">
        <ChatContainer 
          messages={messages}
          isGuardian={isGuardian}
          onMuteUser={muteUser}
          onDeleteMessage={deleteMessage}
          onReplyToMessage={() => {}}
          profanityFilter={profanityFilter}
        />
      </div>

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
