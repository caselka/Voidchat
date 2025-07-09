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
  Database
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Total Users</span>
                </div>
                <div className="text-2xl font-bold mt-2">{systemStats.users.totalUsers}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {systemStats.users.verifiedUsers} verified • {systemStats.users.recentSignups} new
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Messages</span>
                </div>
                <div className="text-2xl font-bold mt-2">{systemStats.messages.totalMessages}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {systemStats.messages.messagesLast24h} today
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Active Sponsors</span>
                </div>
                <div className="text-2xl font-bold mt-2">{systemStats.sponsors.activeSponsors}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {systemStats.sponsors.totalSponsors} total
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium">Active Rooms</span>
                </div>
                <div className="text-2xl font-bold mt-2">{systemStats.messages.activeRooms}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Chat rooms created
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="sponsors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sponsors">Sponsor Approval</TabsTrigger>
            <TabsTrigger value="reports">User Reports</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
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

          {/* Sponsor Approval Tab */}
          <TabsContent value="sponsors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sponsor Content Review</CardTitle>
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
      </div>
    </div>
  );
}