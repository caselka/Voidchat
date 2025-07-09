import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Users, 
  MessageSquare, 
  Settings,
  Clock,
  Trash2,
  Ban,
  Timer,
  BarChart3,
  UserX
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DynamicHeader from "@/components/dynamic-header";

interface RoomMessage {
  id: number;
  text: string;
  username: string;
  createdAt: string;
  ipAddress: string;
}

interface UserRoom {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  messageCount: number;
  isPrivate: boolean;
  slowMode: number;
  maxUsers: number;
  moderators: string[];
  bannedUsers: string[];
  roomRules: string;
}

interface RoomStats {
  messageCount: number;
  activeUsers: number;
  createdAt: string;
  moderatorCount: number;
}

export default function ModeratorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [slowModeSeconds, setSlowModeSeconds] = useState(5);
  const [muteMinutes, setMuteMinutes] = useState(5);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-orange-500" />
              <span>Authentication Required</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You need to be logged in to access the moderator dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch user's rooms
  const { data: userRooms = [] } = useQuery({
    queryKey: ['/api/user-rooms'],
    retry: false,
    enabled: !!user?.id
  });

  // Fetch messages for selected room
  const { data: roomMessages = [] } = useQuery({
    queryKey: ['/api/room-messages', selectedRoom],
    retry: false,
    enabled: !!selectedRoom
  });

  // Fetch room stats
  const { data: roomStats } = useQuery({
    queryKey: ['/api/rooms', selectedRoom, 'stats'],
    retry: false,
    enabled: !!selectedRoom
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("DELETE", `/api/room-messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/room-messages', selectedRoom] });
      toast({
        title: "Message Deleted",
        description: "Message has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete message.",
        variant: "destructive",
      });
    },
  });

  // Mute user mutation
  const muteUserMutation = useMutation({
    mutationFn: async ({ messageId, duration }: { messageId: number; duration: number }) => {
      return await apiRequest("POST", `/api/rooms/${selectedRoom}/mute`, {
        messageId,
        duration,
      });
    },
    onSuccess: () => {
      toast({
        title: "User Muted",
        description: `User has been muted for ${muteMinutes} minutes.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mute user.",
        variant: "destructive",
      });
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("POST", `/api/rooms/${selectedRoom}/ban`, {
        messageId,
      });
    },
    onSuccess: () => {
      toast({
        title: "User Banned",
        description: "User has been banned from the room.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to ban user.",
        variant: "destructive",
      });
    },
  });

  // Set slow mode mutation
  const setSlowModeMutation = useMutation({
    mutationFn: async (seconds: number) => {
      return await apiRequest("POST", `/api/rooms/${selectedRoom}/slow-mode`, {
        seconds,
      });
    },
    onSuccess: () => {
      toast({
        title: "Slow Mode Updated",
        description: `Slow mode set to ${slowModeSeconds} seconds.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update slow mode.",
        variant: "destructive",
      });
    },
  });



  return (
    <div className="min-h-screen bg-background">
      <DynamicHeader />
      
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
            <Shield className="w-8 h-8 text-orange-500" />
            <span>Moderator Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your rooms and moderate content • {user?.username}
          </p>
        </div>

        {/* Room Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Rooms</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userRooms.length}</div>
              <p className="text-xs text-muted-foreground">
                Rooms you moderate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userRooms.reduce((acc, room) => acc + (room.messageCount || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all your rooms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Room</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedRoom || "None"}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently viewing
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rooms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rooms">Room Management</TabsTrigger>
            <TabsTrigger value="moderation">Message Moderation</TabsTrigger>
            <TabsTrigger value="settings">Room Settings</TabsTrigger>
          </TabsList>

          {/* Room Management Tab */}
          <TabsContent value="rooms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Rooms</CardTitle>
                <CardDescription>
                  Rooms you own and moderate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userRooms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>You don't own any rooms yet</p>
                    <p className="text-sm">Create a room to start moderating</p>
                  </div>
                ) : (
                  userRooms.map((room: UserRoom) => (
                    <div key={room.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold">{room.name}</h3>
                            <p className="text-sm text-muted-foreground">{room.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {room.messageCount || 0} messages
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => setSelectedRoom(room.name)}
                            variant={selectedRoom === room.name ? "default" : "outline"}
                          >
                            {selectedRoom === room.name ? "Selected" : "Select"}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(room.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Message Moderation Tab */}
          <TabsContent value="moderation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Message Moderation</CardTitle>
                <CardDescription>
                  {selectedRoom ? `Messages in ${selectedRoom}` : "Select a room to view messages"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedRoom ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a room from the Room Management tab</p>
                  </div>
                ) : roomMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No messages in this room</p>
                  </div>
                ) : (
                  roomMessages.map((message: RoomMessage) => (
                    <div key={message.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold">{message.username}</h3>
                            <p className="text-sm">{message.text}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => muteUserMutation.mutate({ 
                              messageId: message.id, 
                              duration: muteMinutes 
                            })}
                            disabled={muteUserMutation.isPending}
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Mute {muteMinutes}min
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => banUserMutation.mutate(message.id)}
                            disabled={banUserMutation.isPending}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Ban
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMessageMutation.mutate(message.id)}
                            disabled={deleteMessageMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleString()} • IP: {message.ipAddress}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Room Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Room Settings</CardTitle>
                <CardDescription>
                  {selectedRoom ? `Configure settings for ${selectedRoom}` : "Select a room to configure settings"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!selectedRoom ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a room from the Room Management tab</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Room Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Messages</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{roomStats?.messageCount || 0}</div>
                          <p className="text-xs text-muted-foreground">Total messages</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Active Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{roomStats?.activeUsers || 0}</div>
                          <p className="text-xs text-muted-foreground">Last 24 hours</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Moderators</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{roomStats?.moderatorCount || 0}</div>
                          <p className="text-xs text-muted-foreground">Active moderators</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Moderation Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Slow Mode</CardTitle>
                          <CardDescription>
                            Set delay between messages
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="slowMode" className="text-sm">Seconds:</Label>
                            <Input
                              id="slowMode"
                              type="number"
                              value={slowModeSeconds}
                              onChange={(e) => setSlowModeSeconds(parseInt(e.target.value))}
                              className="w-20"
                              min="0"
                              max="300"
                            />
                          </div>
                          <Button
                            onClick={() => setSlowModeMutation.mutate(slowModeSeconds)}
                            disabled={setSlowModeMutation.isPending}
                            className="w-full"
                          >
                            <Timer className="w-4 h-4 mr-2" />
                            {setSlowModeMutation.isPending ? "Setting..." : "Set Slow Mode"}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Mute Duration</CardTitle>
                          <CardDescription>
                            Default mute duration for quick actions
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="muteMinutes" className="text-sm">Minutes:</Label>
                            <Select value={muteMinutes.toString()} onValueChange={(value) => setMuteMinutes(parseInt(value))}>
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="60">60</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            This duration will be used for quick mute actions in message moderation.
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                        <CardDescription>
                          Common moderation actions for {selectedRoom}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Button
                            variant="outline"
                            onClick={() => setSlowModeMutation.mutate(0)}
                            disabled={setSlowModeMutation.isPending}
                          >
                            <Timer className="w-4 h-4 mr-2" />
                            Disable Slow Mode
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setSlowModeMutation.mutate(10)}
                            disabled={setSlowModeMutation.isPending}
                          >
                            <Timer className="w-4 h-4 mr-2" />
                            10s Slow Mode
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setSlowModeMutation.mutate(30)}
                            disabled={setSlowModeMutation.isPending}
                          >
                            <Timer className="w-4 h-4 mr-2" />
                            30s Slow Mode
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}