import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, Check, Clock, DollarSign, X, MessageSquare, Calendar, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface GuardianEligibility {
  eligible: boolean;
  superUser?: boolean;
  requirements: {
    paidAccount: boolean;
    messageCount: boolean;
  };
  stats: {
    accountDays: number;
    messagesLast7Days: number;
  };
}

export default function GuardianCheckout() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState<'day' | 'week'>('day');
  const { toast } = useToast();

  // Check eligibility
  const { data: eligibility, isLoading: eligibilityLoading } = useQuery({
    queryKey: ['/api/guardian-eligibility'],
    enabled: isAuthenticated,
    retry: false,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (duration: string) => {
      const response = await apiRequest(`/api/create-guardian-payment`, {
        method: 'POST',
        body: JSON.stringify({ duration }),
        headers: { 'Content-Type': 'application/json' },
      });
      return response;
    },
    onSuccess: async (data) => {
      const stripe = await stripePromise;
      if (stripe && data.clientSecret) {
        await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive",
      });
    },
  });

  // Show login prompt if not authenticated
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Become a Guardian</CardTitle>
            <CardDescription>
              Login or sign up to check your Guardian eligibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Premium features require a paid account with reserved username
              </p>
              <Link href="/login">
                <Button className="w-full">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  Sign Up
                </Button>
              </Link>
            </div>
            <Link href="/chat">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (authLoading || eligibilityLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking eligibility...</p>
        </div>
      </div>
    );
  }

  const handleBecomeGuardian = () => {
    createPaymentMutation.mutate(selectedDuration);
  };

  const isEligible = eligibility?.eligible;
  const isSuperUser = eligibility?.superUser;
  const requirements = eligibility?.requirements || { paidAccount: false, messageCount: false };
  const stats = eligibility?.stats || { accountDays: 0, messagesLast7Days: 0 };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/chat">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Guardian Status</h1>
            <p className="text-muted-foreground">
              Check your eligibility to become a Guardian of the void
            </p>
          </div>
        </div>

        {/* Eligibility Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              {isEligible ? (
                <>
                  <Check className="w-5 h-5 text-green-500 mr-2" />
                  Great! Now you can have control of the void
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                  Keep at it fragment, you have more to go
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isEligible 
                ? "You meet all requirements to become a Guardian"
                : "Complete the requirements below to unlock Guardian privileges"
              }
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Requirements Checklist */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Guardian Requirements</CardTitle>
            <CardDescription>
              You must meet at least one of these requirements:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Paid Account Requirement */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                  requirements.paidAccount 
                    ? 'bg-green-100 dark:bg-green-900/20' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {requirements.paidAccount ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">Paid Account (30+ days)</h3>
                  <p className="text-sm text-muted-foreground">
                    Account age: {stats.accountDays} days
                  </p>
                </div>
              </div>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Message Count Requirement */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                  requirements.messageCount 
                    ? 'bg-green-100 dark:bg-green-900/20' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {requirements.messageCount ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">Active Chatter (500+ messages)</h3>
                  <p className="text-sm text-muted-foreground">
                    Messages in last 7 days: {stats.messagesLast7Days}/500
                  </p>
                </div>
              </div>
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Guardian Powers */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Guardian Powers</CardTitle>
            <CardDescription>
              What you'll be able to do as a Guardian:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Delete inappropriate messages
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Mute disruptive users
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Enable slow mode during busy periods
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                Help maintain a peaceful void
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Payment Section */}
        {isEligible && !isSuperUser && (
          <Card>
            <CardHeader>
              <CardTitle>Guardian Subscription</CardTitle>
              <CardDescription>
                Choose your Guardian duration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Duration Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedDuration === 'day'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedDuration('day')}
                >
                  <div className="text-center">
                    <h3 className="font-medium">Daily</h3>
                    <p className="text-2xl font-bold text-primary">$20</p>
                    <p className="text-sm text-muted-foreground">24 hours</p>
                  </div>
                </div>
                <div
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedDuration === 'week'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedDuration('week')}
                >
                  <div className="text-center">
                    <h3 className="font-medium">Weekly</h3>
                    <p className="text-2xl font-bold text-primary">$100</p>
                    <p className="text-sm text-muted-foreground">7 days</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleBecomeGuardian}
                disabled={createPaymentMutation.isPending}
                className="w-full"
                size="lg"
              >
                {createPaymentMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Become Guardian (${selectedDuration === 'day' ? '20' : '100'})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Super User Message */}
        {isSuperUser && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <Check className="w-5 h-5 mr-2" />
                Founder Access
              </CardTitle>
              <CardDescription>
                You have permanent Guardian privileges as the founder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your Guardian status is permanent and includes all premium features.
                Thank you for creating this space for the community.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}