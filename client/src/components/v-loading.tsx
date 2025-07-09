import { cn } from "@/lib/utils";

interface VLoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function VLoading({ className, size = "md" }: VLoadingProps) {
  const dimensions = {
    sm: { container: "w-6 h-6", line: "12px", dotSize: "2px", spacing: "6px" },
    md: { container: "w-10 h-10", line: "20px", dotSize: "3px", spacing: "10px" },
    lg: { container: "w-16 h-16", line: "32px", dotSize: "4px", spacing: "16px" }
  };
  
  const config = dimensions[size];

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative flex items-center justify-center", config.container)}>
        {/* V Shape Container */}
        <div className="relative" style={{ width: config.spacing, height: config.line }}>
          {/* Left line of V */}
          <div 
            className="absolute bg-current v-line-left"
            style={{
              width: '2px',
              height: config.line,
              left: '0',
              bottom: '0',
              transformOrigin: 'bottom center',
              transform: 'rotate(20deg)',
            }}
          />
          {/* Right line of V */}
          <div 
            className="absolute bg-current v-line-right"
            style={{
              width: '2px', 
              height: config.line,
              right: '0',
              bottom: '0',
              transformOrigin: 'bottom center',
              transform: 'rotate(-20deg)',
            }}
          />
        </div>
        
        {/* Scanning dots positioned at bottom of V */}
        <div 
          className="absolute flex gap-1"
          style={{ 
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="bg-current rounded-full opacity-0 v-dot"
              style={{
                width: config.dotSize,
                height: config.dotSize,
                animationDelay: `${i * 0.3}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}