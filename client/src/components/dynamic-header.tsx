import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Moon, Sun, User, LogOut, Users, MessageSquare, Shield } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface DynamicHeaderProps {
  title?: string;
  showBack?: boolean;
  backUrl?: string;
  showHome?: boolean;
  showRooms?: boolean;
  onRoomsClick?: () => void;
}

export default function DynamicHeader({ 
  title, 
  showBack = false, 
  backUrl = "/", 
  showHome = false,
  showRooms = false,
  onRoomsClick
}: DynamicHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-3 py-2 max-w-full">
        {/* Left side - Back/Home buttons */}
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(backUrl === "/" ? "/chat" : backUrl)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {showHome && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/chat")}
              className="p-2"
            >
              <Home className="h-4 w-4" />
            </Button>
          )}
          {showRooms && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRoomsClick}
              className="p-2 text-purple-600 dark:text-purple-400 border border-purple-600/20 hover:bg-purple-600/10"
              title="Browse Rooms"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="ml-1 text-xs hidden sm:inline">Rooms</span>
            </Button>
          )}
        </div>

        {/* Center - Title */}
        <div className="flex-1 text-center min-w-0">
          {title && (
            <h1 className="text-sm font-medium truncate px-2">
              {title}
            </h1>
          )}
        </div>

        {/* Right side - Theme toggle and auth */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="p-2"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          {/* Backend Dashboard - only show for super users */}
          {isAuthenticated && (user?.username === 'voidteam' || user?.username === 'caselka') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/backend")}
              className="p-2 text-red-600 dark:text-red-400"
              title="Backend Dashboard"
            >
              <Shield className="h-4 w-4" />
            </Button>
          )}

          {/* Moderator Dashboard - show for all authenticated users */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/moderator")}
              className="p-2 text-orange-600 dark:text-orange-400"
              title="Moderator Dashboard"
            >
              <Shield className="h-4 w-4" />
            </Button>
          )}
          
          {/* Account Settings - only show when authenticated */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/member-settings")}
              className="p-2"
              title="Account Settings"
            >
              <Users className="h-4 w-4" />
            </Button>
          )}
          
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => {
                // Direct redirect to logout endpoint - server handles the logout and redirect
                window.location.href = '/api/logout';
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/login")}
              className="p-2"
            >
              <User className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}