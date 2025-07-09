import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Moon, Sun, User, LogOut, Users, Box } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface DynamicHeaderProps {
  title?: string;
  showBack?: boolean;
  backUrl?: string;
  showHome?: boolean;
  showRooms?: boolean;
}

export default function DynamicHeader({ 
  title, 
  showBack = false, 
  backUrl = "/", 
  showHome = false,
  showRooms = false 
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
              onClick={() => setLocation(backUrl)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {showHome && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="p-2"
            >
              <Home className="h-4 w-4" />
            </Button>
          )}
          {showRooms && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/create-room")}
              className="p-2 text-purple-600 dark:text-purple-400"
              title="Create Room"
            >
              <Box className="h-4 w-4" />
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
          
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={async () => {
                try {
                  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                  window.location.href = '/';
                } catch (error) {
                  console.error('Logout error:', error);
                  window.location.href = '/';
                }
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