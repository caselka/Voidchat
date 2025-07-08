import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface GuardianPanelProps {
  onEnableSlowMode: () => void;
}

export default function GuardianPanel({ onEnableSlowMode }: GuardianPanelProps) {
  return (
    <div className="fixed top-20 right-2 md:right-4 w-56 md:w-64 bg-card rounded-lg shadow-lg border border-border p-3 md:p-4 z-40">
      <h3 className="font-medium text-xs md:text-sm mb-2 md:mb-3 text-foreground">Guardian Controls</h3>
      <div className="space-y-2">
        <Button
          onClick={onEnableSlowMode}
          variant="outline"
          size="sm"
          className="w-full text-left justify-start px-2 md:px-3 py-2 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
        >
          <Clock className="w-3 h-3 mr-2" />
          Enable Slow Mode (10s)
        </Button>
        <div className="text-xs text-muted-foreground">
          Tap messages to moderate
        </div>
      </div>
    </div>
  );
}
