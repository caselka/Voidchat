import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, CreditCard, Shield, Calendar, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function MemberSettings() {
  const { user, isLoading } = useAuth();
  const [autoRenew, setAutoRenew] = useState(false);

  // Fetch user status and subscriptions
  const { data: userStatus } = useQuery({
    queryKey: ['/api/username-status'],
    enabled: !!user,
  });

  const { data: guardianStatus } = useQuery({
    queryKey: ['/api/guardian-status'],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please log in to access member settings</p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
          <h1 className="text-3xl font-light tracking-tight">Member Settings</h1>
          <p className="text-muted-foreground">Manage your account and subscriptions</p>
        </div>

        <div className="grid gap-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your account details and current status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <p className="text-lg">{user.username || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-lg">{user.email}</p>
                </div>
              </div>
              
              {userStatus && (
                <div className="flex items-center space-x-2">
                  <Badge variant={userStatus.expired ? "destructive" : "default"}>
                    {userStatus.expired ? "Expired" : "Active"}
                  </Badge>
                  {userStatus.expired && userStatus.inGracePeriod && (
                    <Badge variant="outline">Grace Period</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {userStatus.expired 
                      ? `Grace period ends in ${Math.abs(userStatus.daysUntilExpiration)} days`
                      : `Expires in ${userStatus.daysUntilExpiration} days`
                    }
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Username Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Username Management
              </CardTitle>
              <CardDescription>
                Manage your username renewal and auto-renewal settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userStatus?.expired ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Username Expired</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your username has expired. Renew now to keep your account active.
                  </p>
                  <Button>
                    Renew Username ($3)
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Auto-Renewal</label>
                      <p className="text-xs text-muted-foreground">
                        Automatically renew your username every 30 days
                      </p>
                    </div>
                    <Switch
                      checked={autoRenew}
                      onCheckedChange={setAutoRenew}
                    />
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Update Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guardian Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Guardian Access
              </CardTitle>
              <CardDescription>
                Moderation privileges and subscription status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {guardianStatus?.isGuardian ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="bg-blue-500">
                      <Shield className="mr-1 h-3 w-3" />
                      Active Guardian
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Expires: {new Date(guardianStatus.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You have moderation privileges including message deletion and user muting.
                  </p>
                  <Button variant="outline">
                    Manage Guardian Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Become a Guardian to help moderate the chat community.
                  </p>
                  <Link href="/guardian">
                    <Button>
                      <Shield className="mr-2 h-4 w-4" />
                      Become a Guardian ($20/day)
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Created Rooms */}
          <Card>
            <CardHeader>
              <CardTitle>My Rooms</CardTitle>
              <CardDescription>
                Chat rooms you've created
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create permanent chat rooms for $49 each
                </p>
                <Link href="/create-room">
                  <Button variant="outline" className="w-full">
                    Create New Room
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}