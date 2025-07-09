import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import ChatContainer from "@/components/chat-container";
import MessageInput from "@/components/message-input";

import HumanVerification from "@/components/human-verification";
import Walkthrough from "@/components/walkthrough";
import DynamicHeader from "@/components/dynamic-header";
import RoomsSidebar from "@/components/rooms-sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, MoreVertical, Shield, Megaphone, Info, User, Palette, LogIn, LogOut, Users, Plus, MessageSquare } from "lucide-react";
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
  const { messages, isConnected, currentUser, onlineCount, sendMessage, muteUser, deleteMessage, enableSlowMode, error, rateLimitTime } = useWebSocket();
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
              <MessageSquare className="w-4 h-4 mr-2" />
              {room.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </>
    );
  };

  // Check if user needs human verification (anonymous users only) - DISABLED FOR NOW
  const needsVerification = false; // !isAuthenticated && !isHumanVerified;

  useEffect(() => {
    // Check if user is at bottom - improved for mobile
    const handleScroll = () => {
      const threshold = 150; // Increased threshold for mobile
      const container = document.getElementById('root') || window;
      const scrollElement = container === window ? document.documentElement : container;
      const position = (container === window ? window.innerHeight : container.clientHeight) + 
                      (container === window ? window.scrollY : container.scrollTop);
      const height = scrollElement.scrollHeight;
      setIsAtBottom(position >= height - threshold);
    };

    // Use both window and root container for better mobile support
    window.addEventListener('scroll', handleScroll);
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rootElement) {
        rootElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll when new messages arrive and user is at bottom - improved for mobile
    if (isAtBottom && messages.length > 0) {
      setTimeout(() => {
        const rootElement = document.getElementById('root');
        if (rootElement && rootElement.scrollHeight > rootElement.clientHeight) {
          // Mobile: scroll the root container
          rootElement.scrollTo({ 
            top: rootElement.scrollHeight, 
            behavior: 'smooth' 
          });
        } else {
          // Desktop: scroll the window
          window.scrollTo({ 
            top: document.documentElement.scrollHeight, 
            behavior: 'smooth' 
          });
        }
      }, 100);
    }
  }, [messages, isAtBottom]);

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
    <div className="font-sans bg-background text-foreground transition-colors duration-300 min-h-screen chat-main-container">
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
      
      {/* Human Verification Modal for Anonymous Users - DISABLED */}
      {/* {needsVerification && (
        <HumanVerification onVerified={() => setIsHumanVerified(true)} />
      )} */}
      
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


            
            {/* Rate Limit Indicator */}
            {rateLimitTime > 0 && (
              <div className="text-xs text-muted-foreground">
                Cooldown: {rateLimitTime}s
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Chat Container */}
      <div className="max-w-2xl mx-auto px-3 pb-24 min-h-screen">
        <ChatContainer 
          messages={messages}
          isGuardian={false}
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
