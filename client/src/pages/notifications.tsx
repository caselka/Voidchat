import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Bell, MessageSquare, User, Crown, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import MobileNavigation from '@/components/mobile-navigation';
import MobileSidebar from '@/components/mobile-sidebar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'mention' | 'reply' | 'guardian' | 'system';
  title: string;
  content: string;
  username?: string;
  roomName?: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

interface NotificationSettings {
  mentions: boolean;
  replies: boolean;
  guardianActions: boolean;
  systemAlerts: boolean;
  directMessages: boolean;
}

export default function NotificationsPage() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch notification settings
  const { data: settings } = useQuery({
    queryKey: ['/api/notification-settings'],
    enabled: isAuthenticated,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest('POST', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<NotificationSettings>) => {
      return await apiRequest('PUT', '/api/notification-settings', newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });
      toast({
        title: 'Settings Updated',
        description: 'Your notification preferences have been saved.',
      });
    },
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'guardian':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'system':
        return <Bell className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to view your notifications.</p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={showMobileSidebar} 
        onClose={() => setShowMobileSidebar(false)} 
      />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="mr-3">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Notifications</h1>
          </div>
          <Badge variant="outline" className="text-xs">
            {notifications.filter((n: Notification) => !n.isRead).length} unread
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className={cn('pb-20', isMobile ? 'px-4 pt-4' : 'max-w-2xl mx-auto px-4 pt-8')}>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">No notifications</h2>
                <p className="text-muted-foreground text-sm">
                  You're all caught up! New mentions and activity will appear here.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {notifications.map((notification: Notification) => (
                    <Card
                      key={notification.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        !notification.isRead && 'border-primary/20 bg-primary/5'
                      )}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm truncate">
                                {notification.title}
                              </p>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.content}
                            </p>
                            {notification.username && (
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  @{notification.username}
                                </Badge>
                                {notification.roomName && (
                                  <Badge variant="outline" className="text-xs">
                                    in {notification.roomName}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Mentions</p>
                      <p className="text-sm text-muted-foreground">When someone mentions you in chat</p>
                    </div>
                    <Switch
                      checked={settings?.mentions ?? true}
                      onCheckedChange={(checked) => handleSettingChange('mentions', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Direct Messages</p>
                      <p className="text-sm text-muted-foreground">New direct messages from other users</p>
                    </div>
                    <Switch
                      checked={settings?.directMessages ?? true}
                      onCheckedChange={(checked) => handleSettingChange('directMessages', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Guardian Actions</p>
                      <p className="text-sm text-muted-foreground">Moderation actions affecting you</p>
                    </div>
                    <Switch
                      checked={settings?.guardianActions ?? true}
                      onCheckedChange={(checked) => handleSettingChange('guardianActions', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">System Alerts</p>
                      <p className="text-sm text-muted-foreground">Important system announcements</p>
                    </div>
                    <Switch
                      checked={settings?.systemAlerts ?? true}
                      onCheckedChange={(checked) => handleSettingChange('systemAlerts', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation 
          onSidebarToggle={() => setShowMobileSidebar(true)}
        />
      )}
    </div>
  );
}