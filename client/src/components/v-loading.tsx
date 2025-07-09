import { cn } from "@/lib/utils";

interface VLoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function VLoading({ className, size = "md" }: VLoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  const lineHeight = {
    sm: 12,
    md: 24,
    lg: 36
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Main V shape - edgy hacker style */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Left line of V */}
            <div 
              className="absolute bg-green-400 transform rotate-[20deg] animate-pulse"
              style={{
                width: '2px',
                height: `${lineHeight[size]}px`,
                left: size === 'sm' ? '4px' : size === 'md' ? '8px' : '12px',
                top: '0',
                transformOrigin: 'bottom center'
              }}
            />
            {/* Right line of V */}
            <div 
              className="absolute bg-green-400 transform -rotate-[20deg] animate-pulse"
              style={{
                width: '2px',
                height: `${lineHeight[size]}px`,
                right: size === 'sm' ? '4px' : size === 'md' ? '8px' : '12px',
                top: '0',
                transformOrigin: 'bottom center'
              }}
            />
          </div>
        </div>
        
        {/* Scanning dots for hacker effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-1">
            <div
              className="bg-green-400 rounded-full animate-ping"
              style={{
                width: size === 'sm' ? '2px' : '3px',
                height: size === 'sm' ? '2px' : '3px',
                animationDelay: '0s'
              }}
            />
            <div
              className="bg-green-400 rounded-full animate-ping"
              style={{
                width: size === 'sm' ? '2px' : '3px',
                height: size === 'sm' ? '2px' : '3px',
                animationDelay: '0.3s'
              }}
            />
            <div
              className="bg-green-400 rounded-full animate-ping"
              style={{
                width: size === 'sm' ? '2px' : '3px',
                height: size === 'sm' ? '2px' : '3px',
                animationDelay: '0.6s'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}