import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Clock, Trash, VolumeX } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await apiRequest("POST", "/api/confirm-guardian-payment", {
          paymentIntentId: paymentIntent.id
        });

        toast({
          title: "Payment Successful",
          description: "You are now a Guardian! Refresh the page to see your new powers.",
        });

        setTimeout(() => {
          setLocation('/');
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Complete Payment'}
      </Button>
    </form>
  );
};

export default function GuardianCheckout() {
  const [clientSecret, setClientSecret] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<'day' | 'week'>('day');
  const { toast } = useToast();

  useEffect(() => {
    if (selectedDuration) {
      apiRequest("POST", "/api/create-guardian-payment", { duration: selectedDuration })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to initialize payment",
            variant: "destructive",
          });
        });
    }
  }, [selectedDuration, toast]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
        </div>

        <Card className="mb-6 bg-white dark:bg-void-800 border-void-300 dark:border-void-700">
          <CardHeader>
            <CardTitle className="flex items-center text-void-900 dark:text-void-100">
              <Shield className="w-5 h-5 mr-2 text-green-500" />
              Become a Guardian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-void-600 dark:text-void-400">
              As a Guardian, you can moderate the chat by muting disruptive users, deleting inappropriate messages, and enabling slow mode.
            </p>
            
            <div className="bg-void-100 dark:bg-void-700 rounded-lg p-4">
              <h3 className="font-medium text-sm mb-2 text-void-900 dark:text-void-100">Guardian Powers:</h3>
              <ul className="text-xs text-void-600 dark:text-void-400 space-y-1">
                <li className="flex items-center">
                  <VolumeX className="w-3 h-3 mr-2" />
                  Mute IPs for 10 minutes
                </li>
                <li className="flex items-center">
                  <Trash className="w-3 h-3 mr-2" />
                  Delete abusive messages
                </li>
                <li className="flex items-center">
                  <Clock className="w-3 h-3 mr-2" />
                  Enable slow mode (10s per message)
                </li>
                <li>• All actions are logged</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedDuration === 'day' 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-void-300 dark:border-void-600 hover:border-green-300 dark:hover:border-green-700'
                }`}
                onClick={() => setSelectedDuration('day')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">24 hours</span>
                  <span className="text-lg font-bold text-green-600">$2</span>
                </div>
              </div>
              
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedDuration === 'week' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-void-300 dark:border-void-600 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
                onClick={() => setSelectedDuration('week')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">7 days</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">(50% off)</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">$10</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-void-800 border-void-300 dark:border-void-700">
          <CardHeader>
            <CardTitle className="text-void-900 dark:text-void-100">Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm />
            </Elements>
            
            <div className="text-xs text-void-500 dark:text-void-400 text-center mt-4">
              Payments processed securely via Stripe
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
