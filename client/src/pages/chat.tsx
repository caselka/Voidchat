import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import SimpleChat from "@/components/simple-chat";
import MobileNavigation from "@/components/mobile-navigation";
import MobileSidebar from "@/components/mobile-sidebar";

export default function Chat() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="h-screen">
      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={showMobileSidebar} 
        onClose={() => setShowMobileSidebar(false)} 
      />

      {/* Simple Chat Interface */}
      <SimpleChat />

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation 
          onSidebarToggle={() => setShowMobileSidebar(true)}
        />
      )}
    </div>
  );
}
