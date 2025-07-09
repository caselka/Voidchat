import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface AnimatedGlowBoxProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'green' | 'blue' | 'purple' | 'orange' | 'red';
  intensity?: 'subtle' | 'normal' | 'strong';
  speed?: 'slow' | 'normal' | 'fast';
}

export default function AnimatedGlowBox({
  children,
  className,
  glowColor = 'green',
  intensity = 'normal',
  speed = 'normal',
}: AnimatedGlowBoxProps) {
  const glowColors = {
    green: 'from-green-400/20 via-green-500/30 to-green-400/20',
    blue: 'from-blue-400/20 via-blue-500/30 to-blue-400/20',
    purple: 'from-purple-400/20 via-purple-500/30 to-purple-400/20',
    orange: 'from-orange-400/20 via-orange-500/30 to-orange-400/20',
    red: 'from-red-400/20 via-red-500/30 to-red-400/20',
  };

  const intensityClasses = {
    subtle: 'opacity-40',
    normal: 'opacity-60',
    strong: 'opacity-80',
  };

  const speedClasses = {
    slow: 'animate-pulse-slow',
    normal: 'animate-pulse',
    fast: 'animate-pulse-fast',
  };

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Animated glow border */}
      <div
        className={cn(
          'absolute inset-0 rounded-lg bg-gradient-to-r',
          glowColors[glowColor],
          intensityClasses[intensity],
          speedClasses[speed]
        )}
      />
      
      {/* Moving glow effect */}
      <div
        className={cn(
          'absolute inset-0 rounded-lg opacity-30',
          'bg-gradient-to-r',
          glowColors[glowColor],
          'animate-glow-move'
        )}
      />
      
      {/* Content container */}
      <div className="relative z-10 bg-background/95 backdrop-blur-sm rounded-lg border border-border/50">
        {children}
      </div>
    </div>
  );
}