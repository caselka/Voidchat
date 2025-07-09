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
          "fixed left-0 top-0 h-full w-80 bg-background border-r shadow-lg transform transition-transform duration-300 z-50",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold">Chat Rooms</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Create Room Button */}
            <Button
              onClick={handleCreateRoom}
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Room ($49)
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
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleRoomClick(room.name)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-purple-500" />
                      <span>/{room.name}</span>
                      {isAuthenticated && user?.id === room.creatorId && (
                        <Crown className="w-3 h-3 text-yellow-500" title="You own this room" />
                      )}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">
                    Created {new Date(room.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground text-center">
              Rooms are permanent chat spaces<br />
              Anyone can join, owners can moderate
            </p>
          </div>
        </div>
      </div>
    </>
  );
}