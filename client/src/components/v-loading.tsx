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

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Main V shape */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Left line of V */}
            <div 
              className="absolute bg-current origin-bottom transform rotate-[20deg]"
              style={{
                width: '2px',
                height: size === 'sm' ? '12px' : size === 'md' ? '24px' : '36px',
                left: size === 'sm' ? '4px' : size === 'md' ? '8px' : '12px',
                top: '0',
                animation: 'v-draw-left 1.5s ease-in-out infinite'
              }}
            />
            {/* Right line of V */}
            <div 
              className="absolute bg-current origin-bottom transform rotate-[-20deg]"
              style={{
                width: '2px',
                height: size === 'sm' ? '12px' : size === 'md' ? '24px' : '36px',
                right: size === 'sm' ? '4px' : size === 'md' ? '8px' : '12px',
                top: '0',
                animation: 'v-draw-right 1.5s ease-in-out infinite 0.2s'
              }}
            />
          </div>
        </div>
        
        {/* Scanning dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="bg-current opacity-0"
                style={{
                  width: size === 'sm' ? '2px' : '3px',
                  height: size === 'sm' ? '2px' : '3px',
                  animation: `v-scan-dot 2s ease-in-out infinite ${i * 0.3}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes v-draw-left {
          0%, 20% { 
            height: 0; 
            opacity: 0;
          }
          50% { 
            height: ${size === 'sm' ? '12px' : size === 'md' ? '24px' : '36px'}; 
            opacity: 1;
          }
          70%, 100% { 
            height: ${size === 'sm' ? '12px' : size === 'md' ? '24px' : '36px'}; 
            opacity: 0.3;
          }
        }
        
        @keyframes v-draw-right {
          0%, 20% { 
            height: 0; 
            opacity: 0;
          }
          50% { 
            height: ${size === 'sm' ? '12px' : size === 'md' ? '24px' : '36px'}; 
            opacity: 1;
          }
          70%, 100% { 
            height: ${size === 'sm' ? '12px' : size === 'md' ? '24px' : '36px'}; 
            opacity: 0.3;
          }
        }
        
        @keyframes v-scan-dot {
          0%, 30% { 
            opacity: 0; 
            transform: scale(0);
          }
          60% { 
            opacity: 1; 
            transform: scale(1);
          }
          80%, 100% { 
            opacity: 0; 
            transform: scale(0);
          }
        }
      `}</style>
    </div>
  );
}