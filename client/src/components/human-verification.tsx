import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface HumanVerificationProps {
  onVerified: () => void;
}

export default function HumanVerification({ onVerified }: HumanVerificationProps) {
  const [answer, setAnswer] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  // Simple math captcha - use useState to prevent re-generation on re-render
  const [mathProblem] = useState(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return { num1, num2, correctAnswer: num1 + num2 };
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError("");

    setTimeout(() => {
      if (parseInt(answer) === mathProblem.correctAnswer) {
        onVerified();
      } else {
        setError("Incorrect answer. Please try again.");
        setAnswer("");
      }
      setIsVerifying(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Human Verification</span>
          </CardTitle>
          <CardDescription>
            Please solve this simple math problem to verify you're human
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold bg-muted p-4 rounded-lg">
                {mathProblem.num1} + {mathProblem.num2} = ?
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="answer">Your Answer</Label>
              <Input
                id="answer"
                type="number"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter the result"
                className="text-center text-lg"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <Button 
              type="submit" 
              disabled={isVerifying || !answer}
              className="w-full"
            >
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}