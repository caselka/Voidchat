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
              className={cn(
                "absolute bg-current origin-bottom transform rotate-[20deg] v-line-left",
                size === 'sm' ? 'v-line-sm' : size === 'md' ? 'v-line-md' : 'v-line-lg'
              )}
              style={{
                width: '2px',
                left: size === 'sm' ? '4px' : size === 'md' ? '8px' : '12px',
                top: '0'
              }}
            />
            {/* Right line of V */}
            <div 
              className={cn(
                "absolute bg-current origin-bottom transform rotate-[-20deg] v-line-right",
                size === 'sm' ? 'v-line-sm' : size === 'md' ? 'v-line-md' : 'v-line-lg'
              )}
              style={{
                width: '2px',
                right: size === 'sm' ? '4px' : size === 'md' ? '8px' : '12px',
                top: '0'
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
                className={cn(
                  "bg-current opacity-0 v-dot",
                  size === 'sm' ? 'v-dot-sm' : 'v-dot-md'
                )}
                style={{
                  animationDelay: `${i * 0.3}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>


    </div>
  );
}