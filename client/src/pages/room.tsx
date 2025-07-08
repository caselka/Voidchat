import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Users, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Room {
  id: number;
  name: string;
  creatorId: string;
  createdAt: string;
  isActive: boolean;
}

export default function Room() {
  const { name } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: roomData, isLoading, error } = useQuery({
    queryKey: [`/api/rooms/${name}`],
    enabled: !!name,
  });

  const room: Room | undefined = roomData?.room;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Room Not Found</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The room "/{name}" doesn't exist or has been deactivated.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => setLocation("/chat")} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Global Chat
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/create-room")} 
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Create Room
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isOwner = isAuthenticated && user?.id === room.creatorId;

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-4xl mx-auto pt-20">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>/{room.name}</span>
              {isOwner && <Crown className="w-4 h-4 text-yellow-500" title="You own this room" />}
            </CardTitle>
            <CardDescription>
              Private chat room • Created {new Date(room.createdAt).toLocaleDateString()}
              {isOwner && " • You are the moderator"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Coming Soon:</strong> Real-time chat functionality for this room will be available in the next update.
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={() => setLocation("/chat")} variant="outline" className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                Global Chat
              </Button>
              {isAuthenticated && (
                <Button 
                  onClick={() => setLocation("/create-room")} 
                  variant="outline" 
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Create Another Room
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Room Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Room Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Room ID:</span>
                <p className="font-mono">#{room.id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className={room.isActive ? "text-green-600" : "text-red-600"}>
                  {room.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p>{new Date(room.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Global Mention:</span>
                <p className="font-mono text-blue-600">/{room.name}</p>
              </div>
            </div>
            
            {isOwner && (
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg mt-4">
                <p className="text-sm text-green-700 dark:text-green-400">
                  <Crown className="w-4 h-4 inline mr-1" />
                  As the room owner, you have full moderation powers when chat functionality is enabled.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}