import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/useAuth";
import ChatContainer from "@/components/chat-container";
import MessageInput from "@/components/message-input";
import GuardianPanel from "@/components/guardian-panel";
import HumanVerification from "@/components/human-verification";
import Walkthrough from "@/components/walkthrough";
import DynamicHeader from "@/components/dynamic-header";
import { Button } from "@/components/ui/button";
import { Filter, FilterX } from "lucide-react";

export default function Chat() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { 
    messages, 
    isConnected, 
    isGuardian, 
    currentUser, 
    onlineCount, 
    sendMessage, 
    muteUser, 
    deleteMessage, 
    enableSlowMode, 
    error, 
    rateLimitTime 
  } = useWebSocket();
  
  const [profanityFilter, setProfanityFilter] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  // Check if user needs human verification (anonymous users only) - DISABLED
  const needsVerification = false; // !isAuthenticated && !isHumanVerified;

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isConnected && messages.length > 0) {
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
          <div className="animate-pulse text-muted-foreground text-sm">
            connecting to the void...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Dynamic Header */}
      <DynamicHeader 
        title={`voidchat · ${onlineCount} online`}
        showRooms={true}
      />
      
      {/* Human Verification Modal for Anonymous Users - DISABLED */}
      {/* {needsVerification && (
        <HumanVerification onVerified={() => setIsHumanVerified(true)} />
      )} */}
      
      {/* Guardian Panel */}
      {isGuardian && (
        <div className="pt-14">
          <GuardianPanel onEnableSlowMode={enableSlowMode} />
        </div>
      )}

      {/* Chat Content */}
      <div className={`${isGuardian ? 'pt-4' : 'pt-16'} pb-20 px-3 max-w-2xl mx-auto`}>
        {/* Connection Status */}
        <div className="flex items-center justify-center py-2 mb-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'connected' : 'reconnecting...'}
          </span>
        </div>

        {/* Profanity Filter Toggle */}
        <div className="flex justify-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setProfanityFilter(!profanityFilter)}
            className={`text-xs transition-colors ${
              profanityFilter 
                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle profanity filter"
          >
            {profanityFilter ? (
              <>
                <FilterX className="w-3 h-3 mr-1" />
                Hide profanity: ON
              </>
            ) : (
              <>
                <Filter className="w-3 h-3 mr-1" />
                Hide profanity: OFF
              </>
            )}
          </Button>
        </div>

        {/* Welcome Message */}
        <div className="text-center py-4 text-xs text-muted-foreground">
          <p>Welcome to the void. Messages vanish after 15 minutes.</p>
          {currentUser && (
            <p className="mt-1">
              You are <span className="text-green-500 font-medium">{currentUser}</span>
            </p>
          )}
        </div>

        {/* Chat Messages */}
        <ChatContainer 
          messages={messages}
          isGuardian={isGuardian}
          onMuteUser={muteUser}
          onDeleteMessage={deleteMessage}
          onReplyToMessage={() => {}}
          profanityFilter={profanityFilter}
        />
      </div>

      {/* Message Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto p-3">
          <MessageInput 
            onSendMessage={sendMessage}
            rateLimitTime={rateLimitTime}
            error={error}
          />
        </div>
      </div>

      {/* Walkthrough */}
      <Walkthrough
        isVisible={showWalkthrough}
        onComplete={handleWalkthroughComplete}
        onSkip={handleWalkthroughSkip}
      />
    </div>
  );
}