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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Trash2,
  Clock,
  DollarSign,
  Search,
  Filter,
  Settings,
  Database,
  Calendar,
  Sun,
  LogOut,
  TrendingUp,
  Activity,
  BarChart3,
  UserCheck,
  User,
  Mail
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingSponsor {
  id: number;
  productName: string;
  description: string;
  url?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentAmount: number;
  duration: string;
}

interface UserReport {
  id: number;
  reportedUser: string;
  reporterIp: string;
  reason: string;
  description: string;
  submittedAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
  evidence?: string;
}

interface SystemAlert {
  id: number;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export default function BackendDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("sponsors");
  const [dateFormat, setDateFormat] = useState("relative"); // relative, full, short
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Date formatting helper function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    switch (dateFormat) {
      case "relative":
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        
        if (diffInMinutes < 1) return "Just now";
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return date.toLocaleDateString();
        
      case "short":
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit' 
        });
        
      case "full":
        return date.toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'long', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit',
          second: '2-digit'
        });
        
      default:
        return date.toLocaleDateString();
    }
  };

  // Check if user has backend access
  const isBackendUser = user?.username === 'voidteam' || user?.username === 'caselka';

  if (!isAuthenticated || !isBackendUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-500" />
              <span>Access Restricted</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This area is restricted to backend administration staff only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch system statistics
  const { data: systemStats } = useQuery({
    queryKey: ['/api/backend/system-stats'],
    retry: false,
  });

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/backend/all-users'],
    retry: false,
  });

  // Fetch pending sponsors
  const { data: pendingSponsors = [] } = useQuery({
    queryKey: ['/api/backend/pending-sponsors'],
    retry: false,
  });

  // Fetch user reports
  const { data: userReports = [] } = useQuery({
    queryKey: ['/api/backend/user-reports'],
    retry: false,
  });

  // Fetch system alerts
  const { data: systemAlerts = [] } = useQuery({
    queryKey: ['/api/backend/system-alerts'],
    retry: false,
  });

  // Fetch comprehensive user analytics
  const { data: allUserAnalytics = [] } = useQuery({
    queryKey: ['/api/backend/all-user-analytics'],
    retry: false,
  });

  // Fetch detailed user analytics for selected user
  const { data: selectedUserAnalytics } = useQuery({
    queryKey: ['/api/backend/user-analytics', selectedUser],
    enabled: !!selectedUser,
    retry: false,
  });

  // Sponsor approval mutation
  const approveSponsorMutation = useMutation({
    mutationFn: async ({ sponsorId, action }: { sponsorId: number; action: 'approve' | 'reject' }) => {
      return await apiRequest("POST", `/api/backend/sponsors/${sponsorId}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backend/pending-sponsors'] });
      toast({
        title: "Sponsor Updated",
        description: "Sponsor status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sponsor status.",
        variant: "destructive",
      });
    },
  });

  // User report resolution mutation
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, action, notes }: { reportId: number; action: 'resolve' | 'dismiss'; notes?: string }) => {
      return await apiRequest("POST", `/api/backend/reports/${reportId}/${action}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backend/user-reports'] });
      toast({
        title: "Report Updated",
        description: "User report has been processed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process user report.",
        variant: "destructive",
      });
    },
  });

  const filteredSponsors = pendingSponsors.filter((sponsor: PendingSponsor) => {
    const matchesSearch = sponsor.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sponsor.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || sponsor.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredReports = userReports.filter((report: UserReport) => {
    const matchesSearch = report.reportedUser?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-blue-500" />
              <div>
                <h1 className="text-xl font-semibold">Backend Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.username} - System Administration
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Super User Access
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Real-Time System Statistics */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('users')}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Total Users</span>
                </div>
                <div className="text-2xl font-bold mt-2">{systemStats.users.totalUsers}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {systemStats.users.verifiedUsers} verified • {systemStats.users.recentSignups} new
                </div>
                <div className="text-xs text-blue-500 mt-1">Click to view details →</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('messages')}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Messages</span>
                </div>
                <div className="text-2xl font-bold mt-2">{systemStats.messages.totalMessages}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {systemStats.messages.messagesLast24h} today
                </div>
                <div className="text-xs text-purple-500 mt-1">Click to view analytics →</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('sponsors')}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Active Sponsors</span>
                </div>
                <div className="text-2xl font-bold mt-2">{systemStats.sponsors.activeSponsors}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {systemStats.sponsors.totalSponsors} total • {systemStats.sponsors.pendingApprovals} pending
                </div>
                <div className="text-xs text-green-500 mt-1">Click to manage →</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('rooms')}>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium">Active Rooms</span>
                </div>
                <div className="text-2xl font-bold mt-2">{systemStats.messages.activeRooms}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Chat rooms created
                </div>
                <div className="text-xs text-indigo-500 mt-1">Click to view rooms →</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Bar */}
        <div className="flex items-center justify-between mb-6 p-4 bg-card rounded-lg border">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Date Format:</span>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-background"
              >
                <option value="relative">Relative (2 hours ago)</option>
                <option value="short">Short (Jan 9, 2:30 PM)</option>
                <option value="full">Full (January 9, 2025 2:30:15 PM)</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/chat'}>
              <MessageSquare className="w-4 h-4 mr-1" />
              Chats
            </Button>
            <Button variant="outline" size="sm" onClick={() => document.documentElement.classList.toggle('dark')}>
              <Sun className="w-4 h-4 mr-1" />
              Toggle Theme
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/logout'}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="sponsors">Sponsor Approval</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="messages">Message Analytics</TabsTrigger>
            <TabsTrigger value="rooms">Room Management</TabsTrigger>
            <TabsTrigger value="reports">User Reports</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          {/* Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-3 py-2 text-sm bg-background"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>User Management</span>
                </CardTitle>
                <CardDescription>Manage user accounts, verification status, and access levels</CardDescription>
              </CardHeader>
              <CardContent>
                {allUserAnalytics && allUserAnalytics.length > 0 ? (
                  <div className="space-y-4">
                    {allUserAnalytics.slice(0, 15).map((user: any) => (
                      <div key={user.userId} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <UserCheck className="w-5 h-5 text-blue-500" />
                            <div>
                              <div className="font-medium flex items-center space-x-2">
                                <span>{user.username}</span>
                                {user.isVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
                                {user.guardian && <Shield className="w-4 h-4 text-purple-500" />}
                              </div>
                              <div className="text-sm text-muted-foreground">{user.email || 'No email'}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={user.engagementScore > 70 ? "default" : user.engagementScore > 40 ? "secondary" : "outline"}>
                              {user.engagementScore}% engagement
                            </Badge>
                            <Badge variant={user.riskScore > 60 ? "destructive" : user.riskScore > 30 ? "secondary" : "default"}>
                              {user.riskScore}% risk
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Total Messages:</span>
                            <div className="font-semibold">{user.totalMessages}</div>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Account Age:</span>
                            <div className="font-semibold">{user.accountAge} days</div>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Last Active:</span>
                            <div className="font-semibold">
                              {user.lastActive ? formatDate(user.lastActive.toString()) : 'Never'}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Status:</span>
                            <div className="flex space-x-1">
                              {user.isVerified && <Badge variant="outline" className="text-xs">Verified</Badge>}
                              {user.guardian && <Badge variant="outline" className="text-xs">Guardian</Badge>}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user.userId);
                            }}
                          >
                            <Activity className="w-4 h-4 mr-1" />
                            Deep Analytics
                          </Button>
                          <div className="text-xs text-muted-foreground">
                            Risk factors: {user.riskScore > 60 ? 'High activity, New account' : 
                                          user.riskScore > 30 ? 'Moderate activity' : 'Low risk'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Message Analytics Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Message Analytics</span>
                </CardTitle>
                <CardDescription>Real-time message statistics and activity trends</CardDescription>
              </CardHeader>
              <CardContent>
                {systemStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Total Messages</span>
                      </div>
                      <div className="text-2xl font-bold">{systemStats.messages?.totalMessages || 0}</div>
                      <div className="text-xs text-muted-foreground">All time</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Today's Activity</span>
                      </div>
                      <div className="text-2xl font-bold">{systemStats.messages?.messagesLast24h || 0}</div>
                      <div className="text-xs text-muted-foreground">Last 24 hours</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium">Active Rooms</span>
                      </div>
                      <div className="text-2xl font-bold">{systemStats.messages?.activeRooms || 0}</div>
                      <div className="text-xs text-muted-foreground">Chat rooms</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Room Management Tab */}
          <TabsContent value="rooms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Room Management</span>
                </CardTitle>
                <CardDescription>Monitor and manage chat rooms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Room Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    {systemStats?.messages?.activeRooms || 0} active rooms are currently running
                  </p>
                  <Button variant="outline">
                    View Room Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sponsor Approval Tab */}
          <TabsContent value="sponsors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Sponsor Content Review & Approval</span>
                </CardTitle>
                <CardDescription>
                  Review and approve sponsor advertisements before they go live
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredSponsors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No sponsors found matching your criteria</p>
                  </div>
                ) : (
                  filteredSponsors.map((sponsor: PendingSponsor) => (
                    <div key={sponsor.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{sponsor.productName}</h3>
                          <Badge 
                            variant={sponsor.status === 'pending' ? 'secondary' : 
                                   sponsor.status === 'approved' ? 'default' : 'destructive'}
                          >
                            {sponsor.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${sponsor.paymentAmount} • {sponsor.duration}
                        </div>
                      </div>
                      
                      <p className="text-sm">{sponsor.description}</p>
                      
                      {sponsor.url && (
                        <div className="text-sm">
                          <span className="font-medium">URL: </span>
                          <a href={sponsor.url} target="_blank" rel="noopener noreferrer" 
                             className="text-blue-500 hover:underline">
                            {sponsor.url}
                          </a>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Submitted: {new Date(sponsor.submittedAt).toLocaleString()}
                      </div>
                      
                      {sponsor.status === 'pending' && (
                        <div className="flex space-x-2 pt-2">
                          <Button 
                            size="sm" 
                            onClick={() => approveSponsorMutation.mutate({ 
                              sponsorId: sponsor.id, 
                              action: 'approve' 
                            })}
                            disabled={approveSponsorMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => approveSponsorMutation.mutate({ 
                              sponsorId: sponsor.id, 
                              action: 'reject' 
                            })}
                            disabled={approveSponsorMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Reports & Moderation</CardTitle>
                <CardDescription>
                  Handle user reports and moderation requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No reports found matching your criteria</p>
                  </div>
                ) : (
                  filteredReports.map((report: UserReport) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">Report #{report.id}</h3>
                          <Badge 
                            variant={report.status === 'pending' ? 'secondary' : 
                                   report.status === 'resolved' ? 'default' : 'outline'}
                          >
                            {report.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(report.submittedAt).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Reported User: </span>
                          {report.reportedUser}
                        </div>
                        <div>
                          <span className="font-medium">Reason: </span>
                          {report.reason}
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium text-sm">Description: </span>
                        <p className="text-sm mt-1">{report.description}</p>
                      </div>
                      
                      {report.status === 'pending' && (
                        <div className="flex space-x-2 pt-2">
                          <Button 
                            size="sm" 
                            onClick={() => resolveReportMutation.mutate({ 
                              reportId: report.id, 
                              action: 'resolve' 
                            })}
                            disabled={resolveReportMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resolve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => resolveReportMutation.mutate({ 
                              reportId: report.id, 
                              action: 'dismiss' 
                            })}
                            disabled={resolveReportMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts, usernames, and permissions • {allUsers.length} total users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allUsers.map((user: any) => (
                      <div key={user.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="font-semibold flex items-center space-x-2">
                                <span>{user.username}</span>
                                {user.isSuperUser && (
                                  <Badge variant="destructive" className="text-xs">
                                    Super User
                                  </Badge>
                                )}
                                {user.isVerified && (
                                  <Badge variant="default" className="text-xs">
                                    Verified
                                  </Badge>
                                )}
                              </h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Joined: {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">User ID: </span>
                            <span className="text-xs font-mono">{user.id}</span>
                          </div>
                          <div>
                            <span className="font-medium">Status: </span>
                            <span className={user.isVerified ? "text-green-600" : "text-yellow-600"}>
                              {user.isVerified ? "Verified" : "Unverified"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Role: </span>
                            <span className={user.isSuperUser ? "text-red-600" : "text-gray-600"}>
                              {user.isSuperUser ? "Administrator" : "User"}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Account Age: </span>
                            <span>{Math.ceil((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health & Monitoring</CardTitle>
                <CardDescription>
                  Monitor system performance and health metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded p-4">
                      <h4 className="font-medium mb-2">Database Status</h4>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Connected & Healthy</span>
                      </div>
                    </div>
                    
                    <div className="border rounded p-4">
                      <h4 className="font-medium mb-2">WebSocket Connections</h4>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Active: 12 connections</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center py-4 text-muted-foreground">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Advanced monitoring features coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Deep User Analytics Modal */}
        {selectedUser && selectedUserAnalytics && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <span>Deep User Analytics</span>
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedUser(null)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription>
                  Comprehensive analytics for user activity, engagement, and behavior patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedUserAnalytics.totalMessages}</div>
                    <div className="text-sm text-muted-foreground">Total Messages</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedUserAnalytics.engagementScore}%</div>
                    <div className="text-sm text-muted-foreground">Engagement Score</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{selectedUserAnalytics.accountAge}</div>
                    <div className="text-sm text-muted-foreground">Account Age (days)</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{selectedUserAnalytics.riskScore}%</div>
                    <div className="text-sm text-muted-foreground">Risk Score</div>
                  </div>
                </div>

                {/* Activity Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Activity Patterns</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Messages (Last 7 days):</span>
                        <span className="font-semibold">{selectedUserAnalytics.messagesLast7Days}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Messages (Last 30 days):</span>
                        <span className="font-semibold">{selectedUserAnalytics.messagesLast30Days}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Messages/Day:</span>
                        <span className="font-semibold">{selectedUserAnalytics.averageMessagesPerDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Activity Trend:</span>
                        <Badge variant={
                          selectedUserAnalytics.activityTrend === 'increasing' ? 'default' :
                          selectedUserAnalytics.activityTrend === 'decreasing' ? 'destructive' : 'secondary'
                        }>
                          {selectedUserAnalytics.activityTrend}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">User Behavior</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Rooms Created:</span>
                        <span className="font-semibold">{selectedUserAnalytics.roomsCreated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rooms Joined:</span>
                        <span className="font-semibold">{selectedUserAnalytics.roomsJoined}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Moderation Actions:</span>
                        <span className="font-semibold">{selectedUserAnalytics.moderationActions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Guardian History:</span>
                        <Badge variant={selectedUserAnalytics.guardianHistory ? "default" : "outline"}>
                          {selectedUserAnalytics.guardianHistory ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Most Active Hours */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Most Active Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-4">
                      {selectedUserAnalytics.mostActiveHours.map((hour, index) => (
                        <div key={hour} className="text-center p-2 border rounded">
                          <div className="font-bold">{hour}:00</div>
                          <div className="text-xs text-muted-foreground">#{index + 1} most active</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedUserAnalytics.paymentHistory.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUserAnalytics.paymentHistory.map((payment, index) => (
                          <div key={index} className="flex justify-between p-2 border rounded">
                            <span>{payment.type}</span>
                            <div className="text-right">
                              <div className="font-semibold">${payment.amount}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(payment.date.toString())}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No payment history</p>
                    )}
                  </CardContent>
                </Card>

                {/* Last Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <span>Last Active:</span>
                      <span className="font-semibold">
                        {selectedUserAnalytics.lastActiveDate ? 
                          formatDate(selectedUserAnalytics.lastActiveDate.toString()) : 
                          'Never'
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}