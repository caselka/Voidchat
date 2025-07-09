import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface UserMentionProps {
  onMention: (username: string) => void;
  isVisible: boolean;
  searchTerm: string;
  position: { top: number; left: number };
  roomName?: string;
}

interface UserSearchResult {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeen?: string;
}

export default function UserMention({
  onMention,
  isVisible,
  searchTerm,
  position,
  roomName,
}: UserMentionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch users for mentions (global or room-specific)
  const { data: users = [] } = useQuery({
    queryKey: roomName ? ['/api/room-users', roomName] : ['/api/active-users'],
    enabled: isVisible && searchTerm.length > 0,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Filter users based on search term
  const filteredUsers = users.filter((user: UserSearchResult) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    user.username !== searchTerm // Don't show exact matches
  ).slice(0, 5); // Limit to 5 suggestions

  // Reset selection when filtered users change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredUsers]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || filteredUsers.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            onMention(filteredUsers[selectedIndex].username);
          }
          break;
        case 'Escape':
          onMention(''); // Close without selecting
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, filteredUsers, selectedIndex, onMention]);

  if (!isVisible || filteredUsers.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-64 bg-popover border rounded-lg shadow-lg"
      style={{
        top: position.top - 120, // Position above the cursor
        left: position.left,
      }}
    >
      <div className="p-2 border-b">
        <p className="text-xs text-muted-foreground">
          {roomName ? `Users in ${roomName}` : 'Active users'}
        </p>
      </div>
      
      <ScrollArea className="max-h-40">
        <div className="p-1">
          {filteredUsers.map((user: UserSearchResult, index: number) => (
            <Button
              key={user.id}
              variant="ghost"
              size="sm"
              className={cn(
                'w-full justify-start h-auto p-2 mb-1',
                index === selectedIndex && 'bg-accent text-accent-foreground'
              )}
              onClick={() => onMention(user.username)}
            >
              <div className="flex items-center space-x-2 w-full">
                <div className="relative">
                  <User className="w-4 h-4" />
                  {user.isOnline && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-background" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{user.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.isOnline ? 'Online' : user.lastSeen ? `Last seen ${user.lastSeen}` : 'Offline'}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t">
        <p className="text-xs text-muted-foreground">
          Use ↑↓ to navigate, Enter to select, Esc to cancel
        </p>
      </div>
    </div>
  );
}