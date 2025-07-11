import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Users, Crown, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Room {
  id: number;
  name: string;
  creatorId: string;
  createdAt: string;
  isActive: boolean;
}

interface RoomsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoomsSidebar({ isOpen, onClose }: RoomsSidebarProps) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ["/api/rooms"],
    enabled: isOpen,
  });

  const rooms: Room[] = roomsData || [];

  const handleRoomClick = (roomName: string) => {
    setLocation(`/room/${roomName}`);
    onClose();
  };

  const handleCreateRoom = () => {
    setLocation("/create-room");
    onClose();
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('rooms-sidebar');
      if (isOpen && sidebar && !sidebar.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        id="rooms-sidebar"
        className={cn(
          "fixed left-0 top-0 h-full w-80 bg-background border-r shadow-xl transform transition-all duration-300 z-50",
          "md:w-96", // Wider on desktop
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: 'var(--bg)',
          borderRight: '1px solid var(--border-subtle)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bubble-other)' }}>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Chat Rooms</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 rounded-lg hover:bg-muted/80"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Create Room Button */}
            <Button
              onClick={handleCreateRoom}
              className="w-full justify-start h-12 text-left rounded-xl transition-all duration-200 hover:scale-[1.02]"
              variant="outline"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bubble-other)',
                color: 'var(--text)'
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Create New Room</div>
                  <div className="text-xs opacity-70">$49 • Permanent space</div>
                </div>
              </div>
            </Button>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}

            {/* Rooms List */}
            {!isLoading && rooms.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No rooms available</p>
                    <p className="text-xs mt-1">Be the first to create one!</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isLoading && rooms.map((room) => (
              <Card 
                key={room.id}
                className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md border-0 rounded-xl"
                onClick={() => handleRoomClick(room.name)}
                style={{
                  backgroundColor: 'var(--bubble-other)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span style={{ color: 'var(--text)' }}>/{room.name}</span>
                          {isAuthenticated && user?.id === room.creatorId && (
                            <div className="p-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                              <Crown className="w-3 h-3 text-yellow-600 dark:text-yellow-400" title="You own this room" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          Created {new Date(room.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardTitle>
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    >
                      Live
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t" style={{ 
            borderColor: 'var(--border-subtle)', 
            backgroundColor: 'var(--bubble-other)'
          }}>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                  Permanent Chat Spaces
                </p>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Free to join • Moderated by owners
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}