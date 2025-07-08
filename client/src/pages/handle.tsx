import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { isUnauthorizedError } from '@/lib/authUtils';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ handle, duration }: { handle: string; duration: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: `Your handle "${handle}" is now active!`,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full">
        Complete Payment
      </Button>
    </form>
  );
};

export default function Handle() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [handle, setHandle] = useState('');
  const [duration, setDuration] = useState('permanent');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [currentHandle, setCurrentHandle] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [error, setError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You need to log in to purchase custom handles. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    // Check if user already has a handle
    apiRequest('GET', '/api/my-handle')
      .then(res => res.json())
      .then(data => {
        if (data.handle) {
          setCurrentHandle(data.handle);
        }
      });
  }, []);

  const checkAvailability = async (handleToCheck: string) => {
    if (!handleToCheck || handleToCheck.length < 2) {
      setIsAvailable(null);
      setError('');
      return;
    }

    try {
      const res = await apiRequest('GET', `/api/check-handle/${handleToCheck}`);
      const data = await res.json();
      setIsAvailable(data.available);
      
      if (!data.available && data.reason) {
        setError(data.reason);
      } else {
        setError('');
      }
    } catch (error) {
      console.error('Error checking handle:', error);
      setError('Error checking username availability');
    }
  };

  const createPayment = async () => {
    if (!handle || isAvailable === false) return;

    try {
      const res = await apiRequest('POST', '/api/create-handle-payment', {
        handle,
        duration
      });
      const data = await res.json();
      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    }
  };

  const handleChange = (value: string) => {
    setHandle(value);
    checkAvailability(value);
  };

  const price = duration === 'permanent' ? '$3' : '$1';
  const validity = duration === 'permanent' ? '30 days' : '7 days';

  if (currentHandle) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-20">
          <Link href="/chat">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Your Handle</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-2xl font-mono text-void-900 dark:text-void-100">
                {currentHandle}
              </div>
              <Badge variant="secondary">Active</Badge>
              <p className="text-sm text-void-600 dark:text-void-400">
                Your custom handle is active and will appear in chat messages.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'payment' && clientSecret) {
    return (
      <div className="min-h-screen bg-void-50 dark:bg-void-900 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Button variant="ghost" className="mb-4" onClick={() => setStep('form')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>Complete Purchase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-void-100 dark:bg-void-800 rounded">
                <div className="flex justify-between">
                  <span>Handle:</span>
                  <span className="font-mono">{handle}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{validity}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>{price}</span>
                </div>
              </div>
              
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm handle={handle} duration={duration} />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto pt-20">
        <Link href="/chat">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle>Custom Handle</CardTitle>
            <p className="text-sm text-void-600 dark:text-void-400">
              Choose a unique anonymous handle instead of random names like "anon2843"
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <div className="relative">
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="Enter your handle"
                  className="pr-8"
                  minLength={3}
                  maxLength={20}
                />
                {handle && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {isAvailable === true && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {isAvailable === false && (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {isAvailable === false && (
                <p className="text-sm text-red-500">{error || 'Handle not available'}</p>
              )}
              {isAvailable === true && (
                <p className="text-sm text-green-500">Handle available!</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Duration</Label>
              <RadioGroup value={duration} onValueChange={setDuration}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="temporary" id="temporary" />
                  <Label htmlFor="temporary" className="flex-1">
                    <div className="flex justify-between">
                      <span>7 days</span>
                      <span className="font-medium">$1</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="permanent" id="permanent" />
                  <Label htmlFor="permanent" className="flex-1">
                    <div className="flex justify-between">
                      <span>30 days</span>
                      <span className="font-medium">$3</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button 
              onClick={createPayment}
              disabled={!handle || isAvailable !== true}
              className="w-full"
            >
              Purchase Handle - {price}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}