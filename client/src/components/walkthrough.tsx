import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft } from "lucide-react";

interface WalkthroughProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const walkthroughSteps = [
  {
    title: "Welcome to voidchat!",
    description: "This is an anonymous chat where messages disappear after 15 minutes. Let me show you around.",
    target: null,
    position: "center"
  },
  {
    title: "Send Messages",
    description: "Type your message here and press Enter to send it to everyone in the void.",
    target: "[data-walkthrough='message-input']",
    position: "top"
  },
  {
    title: "Profanity Filter",
    description: "Click this button to hide curse words with ### symbols. Perfect for a cleaner experience.",
    target: "[data-walkthrough='profanity-filter']",
    position: "bottom"
  },
  {
    title: "Theme Toggle",
    description: "Switch between light and dark themes to match your mood.",
    target: "[data-walkthrough='theme-toggle']",
    position: "bottom"
  },
  {
    title: "Rooms",
    description: "Explore different chat rooms or create your own permanent room (requires paid account).",
    target: "[data-walkthrough='rooms-button']",
    position: "bottom"
  },
  {
    title: "Premium Features",
    description: "Sign up for $3 to reserve a custom username, customize themes, and become a Guardian moderator.",
    target: "[data-walkthrough='menu-button']",
    position: "bottom"
  }
];

export default function Walkthrough({ isVisible, onComplete, onSkip }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightTarget, setHighlightTarget] = useState<Element | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Remove previous highlight
    if (highlightTarget) {
      highlightTarget.classList.remove('walkthrough-highlight');
    }

    const step = walkthroughSteps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target);
      setHighlightTarget(element);
      
      // Add highlighting and scroll into view
      if (element) {
        element.classList.add('walkthrough-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightTarget(null);
    }

    return () => {
      // Cleanup highlight when unmounting
      const allHighlighted = document.querySelectorAll('.walkthrough-highlight');
      allHighlighted.forEach(el => el.classList.remove('walkthrough-highlight'));
    };
  }, [currentStep, isVisible]);

  if (!isVisible) return null;

  const currentStepData = walkthroughSteps[currentStep];
  const isLastStep = currentStep === walkthroughSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" />
      
      {/* Walkthrough Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {walkthroughSteps.length}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{currentStepData.description}</p>
            
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex space-x-1">
                {walkthroughSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              
              <Button
                size="sm"
                onClick={handleNext}
                className="flex items-center"
              >
                {isLastStep ? 'Finish' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="w-full text-muted-foreground"
            >
              Skip tour
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}