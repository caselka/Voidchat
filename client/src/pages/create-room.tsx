import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DynamicHeader from "@/components/dynamic-header";
import AnimatedGlowBox from "@/components/animated-glow-box";
import { Loader2 } from "lucide-react";
import { Home, Shield, Users } from "lucide-react";

export default function CreateRoom() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [roomName, setRoomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mb-4 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <DynamicHeader 
          title="Create Room"
          showBack={true}
          backUrl="/chat"
        />
        <div className="max-w-2xl mx-auto pt-20 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Create Private Room</span>
              </CardTitle>
              <CardDescription>
                You need a paid account to create permanent chat rooms.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Premium features require a paid account with reserved username. 
                Please login with a paid account to create rooms.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => setLocation("/login")} className="flex-1">
                  Login
                </Button>
                <Button variant="outline" onClick={() => setLocation("/")} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setIsCreating(true);
    try {
      const response = await apiRequest("POST", "/api/create-room-payment", { name: roomName.trim() });
      const result = await response.json();
      
      if (response.ok) {
        if (result.isFree) {
          // Super user - room created immediately
          toast({
            title: "Room Created!",
            description: result.message,
          });
          setLocation(`/room/${result.room.name}`);
        } else {
          // Regular user - redirect to payment
          setLocation(`/room-checkout?clientSecret=${result.clientSecret}&roomName=${result.roomName}`);
        }
      } else {
        toast({
          title: "Creation Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DynamicHeader 
        title="Create Room"
        showBack={true}
        backUrl="/chat"
      />
      <div className="max-w-2xl mx-auto pt-20 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Create Private Room</span>
            </CardTitle>
            <CardDescription>
              Create your own permanent chat room for $49 USD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRoom} className="space-y-6 hacker-scan matrix-bg">
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  placeholder="my-awesome-room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="font-mono"
                  maxLength={20}
                />
                <p className="text-sm text-muted-foreground">
                  3-20 characters, lowercase letters, numbers, dashes, and underscores only
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h3 className="font-medium flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Room Features</span>
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Permanent, unique room name</li>
                  <li>• You become the room moderator</li>
                  <li>• Free access for all users</li>
                  <li>• Messages expire after 15 minutes</li>
                  <li>• Room mentions in global chat (/room-name)</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Price:</strong> $49 USD (one-time payment)
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  Secure payment processing via Stripe
                </p>
              </div>

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={isCreating || !roomName.trim()}
                  className="flex-1 hacker-pulse"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Room ($49)"
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/")}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Chat
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}