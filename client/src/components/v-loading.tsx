import { cn } from "@/lib/utils";

interface VLoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function VLoading({ className, size = "md" }: VLoadingProps) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative", sizeMap[size])}>
        {/* Simple V using CSS borders - much more reliable */}
        <div 
          className="absolute inset-0 animate-pulse"
          style={{
            borderLeft: '3px solid currentColor',
            borderRight: '3px solid currentColor',
            borderBottom: '3px solid currentColor',
            borderTop: 'none',
            transform: 'perspective(10px) rotateX(5deg)',
            clipPath: 'polygon(20% 0%, 50% 100%, 80% 0%)',
          }}
        />
        
        {/* Scanning line effect */}
        <div 
          className="absolute inset-0 overflow-hidden"
        >
          <div 
            className="absolute w-full h-0.5 bg-green-400 opacity-80"
            style={{
              top: '20%',
              left: '0',
              animation: 'v-scan 2s ease-in-out infinite'
            }}
          />
        </div>
        
        {/* Pulsing dots at bottom */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1 h-1 bg-green-400 rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 0.5}s`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}