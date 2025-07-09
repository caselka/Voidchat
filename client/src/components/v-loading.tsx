import { cn } from "@/lib/utils";

interface VLoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function VLoading({ className, size = "md" }: VLoadingProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Simple V shape with green pulse animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-full h-full text-green-400 animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2 L12 18 L16 2" />
          </svg>
        </div>
        
        {/* Pulsing green ring */}
        <div className="absolute inset-0 border-2 border-green-400/30 rounded-full animate-ping" />
      </div>
    </div>
  );
}