import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { X, MessageSquare, User, Settings, LogOut, Crown, Shield, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { Room } from '@shared/schema';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { user, isAuthenticated } = useAuth();
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ['/api/rooms'],
    enabled: true,
  });

  // Handle swipe gestures
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!isOpen) return;
      setStartX(e.touches[0].clientX);
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !isOpen) return;
      const currentX = e.touches[0].clientX;
      const diffX = currentX - startX;
      
      if (diffX < -50) {
        setCurrentX(diffX);
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging || !isOpen) return;
      
      if (currentX < -100) {
        onClose();
      }
      
      setIsDragging(false);
      setCurrentX(0);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, isDragging, startX, currentX, onClose]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest('.mobile-sidebar')) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'mobile-sidebar fixed top-0 left-0 z-50 h-full w-80 bg-background border-r transition-transform duration-300 md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          transform: isDragging ? `translateX(${Math.min(0, currentX)}px)` : undefined,
        }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">V</span>
              </div>
              <div>
                <h2 className="font-semibold text-lg">Voidchat</h2>
                <p className="text-xs text-muted-foreground">Anonymous Chat</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* User Info */}
          {isAuthenticated && user && (
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                {user.username === 'caselka' || user.username === 'voidteam' ? (
                  <Badge variant="destructive" className="text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Super
                  </Badge>
                ) : null}
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Rooms Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Rooms
                  </h3>
                  {isAuthenticated && (
                    <Link href="/create-room">
                      <Button variant="ghost" size="sm" onClick={onClose}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </div>
                <div className="space-y-1">
                  {rooms.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-3 py-2">
                      No rooms available
                    </p>
                  ) : (
                    rooms.map((room: Room) => (
                      <Link key={room.id} href={`/room/${room.name}`}>
                        <div
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                          onClick={onClose}
                        >
                          <div className="flex items-center space-x-3">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{room.name}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* Account & Settings */}
              {isAuthenticated ? (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Account
                  </h3>
                  <div className="space-y-1">
                    <Link href="/account">
                      <div
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        onClick={onClose}
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Account Settings</span>
                      </div>
                    </Link>
                    
                    {(user?.username === 'caselka' || user?.username === 'voidteam') && (
                      <Link href="/backend">
                        <div
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                          onClick={onClose}
                        >
                          <Shield className="w-4 h-4 text-red-500" />
                          <span className="font-medium">Backend Dashboard</span>
                          <Badge variant="destructive" className="text-xs">Admin</Badge>
                        </div>
                      </Link>
                    )}
                    
                    <Link href="/moderator">
                      <div
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        onClick={onClose}
                      >
                        <Shield className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">Moderator</span>
                      </div>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Account
                  </h3>
                  <div className="space-y-1">
                    <Link href="/login">
                      <div
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        onClick={onClose}
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Sign In</span>
                      </div>
                    </Link>
                    <Link href="/register">
                      <div
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        onClick={onClose}
                      >
                        <Plus className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Create Account ($3)</span>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}