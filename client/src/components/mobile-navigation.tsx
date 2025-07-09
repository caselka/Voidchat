import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Search, Bell, Mail, Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface MobileNavigationProps {
  onSidebarToggle?: () => void;
  className?: string;
}

export default function MobileNavigation({ onSidebarToggle, className }: MobileNavigationProps) {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Fetch unread messages count
  const { data: unreadData } = useQuery({
    queryKey: ['/api/unread-count'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Hide/show navigation on scroll (iOS style)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: '/chat',
      active: location === '/chat' || location === '/',
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      href: '/search',
      active: location === '/search',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      href: '/notifications',
      active: location === '/notifications',
      badge: 0, // TODO: Implement mentions count
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: Mail,
      href: '/messages',
      active: location === '/messages',
      badge: unreadData?.count || 0,
      requireAuth: true,
    },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t transition-transform duration-300 md:hidden',
          isVisible ? 'translate-y-0' : 'translate-y-full',
          className
        )}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const shouldShow = !item.requireAuth || isAuthenticated;
            
            if (!shouldShow) return null;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-[60px]',
                  item.active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 mb-1" />
                  {item.badge && item.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Sidebar Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="flex flex-col items-center justify-center p-2 min-w-[60px]"
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Menu</span>
          </Button>
        </div>
      </div>

      {/* Spacer for fixed navigation */}
      <div className="h-16 md:hidden" />
    </>
  );
}