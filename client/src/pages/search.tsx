import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Search, MessageSquare, User, Clock, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import MobileNavigation from '@/components/mobile-navigation';
import MobileSidebar from '@/components/mobile-sidebar';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'message' | 'room' | 'user';
  id: string;
  content: string;
  username?: string;
  roomName?: string;
  timestamp?: string;
  isOnline?: boolean;
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isAuthenticated } = useAuth();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Search API call with debouncing
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['/api/search', searchTerm],
    enabled: searchTerm.length > 2,
    refetchOnWindowFocus: false,
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const renderSearchResult = (result: SearchResult) => {
    switch (result.type) {
      case 'message':
        return (
          <Card key={`${result.type}-${result.id}`} className="mb-3">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{result.username}</span>
                    <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                  </div>
                  <p className="text-sm text-foreground mb-2">{result.content}</p>
                  {result.roomName && (
                    <Badge variant="outline" className="text-xs">
                      in {result.roomName}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'room':
        return (
          <Card key={`${result.type}-${result.id}`} className="mb-3">
            <CardContent className="p-4">
              <Link href={`/room/${result.content}`}>
                <div className="flex items-center space-x-3 hover:bg-muted/50 rounded p-2 -m-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="font-medium text-sm">{result.content}</span>
                    <p className="text-xs text-muted-foreground">Chat room</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        );
      
      case 'user':
        return (
          <Card key={`${result.type}-${result.id}`} className="mb-3">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {result.isOnline && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-medium text-sm">{result.content}</span>
                  <p className="text-xs text-muted-foreground">
                    {result.isOnline ? 'Online' : 'User'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={showMobileSidebar} 
        onClose={() => setShowMobileSidebar(false)} 
      />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b">
        <div className="flex items-center px-4 py-3">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="mr-3">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages, rooms, and users..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 bg-muted/50"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn('pb-20', isMobile ? 'px-4 pt-4' : 'max-w-2xl mx-auto px-4 pt-8')}>
        {!searchTerm && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Search Voidchat</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Find messages, rooms, and users across the platform. Type at least 3 characters to start searching.
            </p>
          </div>
        )}

        {searchTerm && searchTerm.length < 3 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              Keep typing... (minimum 3 characters)
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Searching...</p>
          </div>
        )}

        {searchTerm && searchTerm.length >= 3 && !isLoading && searchResults.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No results found for "{searchTerm}"</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
              </p>
            </div>
            <ScrollArea className="h-full">
              {searchResults.map(renderSearchResult)}
            </ScrollArea>
          </div>
        )}
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