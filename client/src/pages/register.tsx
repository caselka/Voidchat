import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
if (!stripeKey) {
  console.error('Missing VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const PaymentForm = ({ paymentIntent, formData, onBack, onSuccess }: {
  paymentIntent: string;
  formData: any;
  onBack: () => void;
  onSuccess: () => void;
}) => {
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Payment system not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent: confirmedPayment } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (confirmedPayment && confirmedPayment.status === 'succeeded') {
        // Complete registration after successful payment
        try {
          await apiRequest("POST", "/api/complete-username-registration", {
            payment_intent_id: confirmedPayment.id,
            username: formData.username,
            email: formData.email,
            password: formData.password,
          });
          
          toast({
            title: "Registration Successful!",
            description: "Your account has been created and is ready to use.",
          });
          
          // Redirect after a short delay
          setTimeout(onSuccess, 1500);
        } catch (registrationError: any) {
          toast({
            title: "Registration Error",
            description: registrationError.message || "Failed to complete registration",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 hacker-scan matrix-bg">
      <div className="text-center">
        <h3 className="text-lg font-semibold hacker-typewriter">Complete Your Registration</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Username: <span className="font-medium text-green-400">{formData.username}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Cost: <span className="font-medium">$3.00</span> (one-time username reservation fee)
        </p>
      </div>
      
      <PaymentElement />
      
      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 hacker-pulse"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            "Complete Registration"
          )}
        </Button>
      </div>
    </form>
  );
};

const RegistrationForm = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [paymentIntent, setPaymentIntent] = useState<string>("");

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Error", 
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Create payment intent for $3 username reservation
      const response = await apiRequest("POST", "/api/create-username-payment", {
        username: formData.username,
        email: formData.email,
        amount: 300, // $3.00 in cents
      });
      
      const data = await response.json();
      setPaymentIntent(data.clientSecret);
      setStep('payment');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process registration",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Empty placeholder - payment form will handle its own submission

  if (step === 'payment' && paymentIntent) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: paymentIntent,
        }}
      >
        <PaymentForm 
          paymentIntent={paymentIntent} 
          formData={formData}
          onBack={() => setStep('details')}
          onSuccess={() => setLocation("/login?registration=success")}
        />
      </Elements>
    );
  }

  return (
    <form onSubmit={handleDetailsSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="Choose your username"
          required
          minLength={3}
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground">
          3-20 characters, letters, numbers, and underscores only
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="your@email.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Create a strong password"
          required
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          placeholder="Confirm your password"
          required
        />
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Username Reservation</span>
          <span className="text-lg font-bold">$3.00</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          One-time fee to secure your unique username
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isProcessing}
      >
        {isProcessing ? "Processing..." : "Continue to Payment"}
      </Button>

      <div className="text-center">
        <Link href="/login">
          <Button variant="link" className="text-sm">
            Already have an account? Sign in
          </Button>
        </Link>
      </div>
    </form>
  );
};

export default function Register() {
  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Registration Unavailable</h2>
            <p className="text-muted-foreground">
              Payment processing is currently unavailable. Please try again later.
            </p>
            <Link href="/login" className="mt-4 inline-block">
              <Button variant="outline">Back to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Reserve your username for $3 USD
          </CardDescription>
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <strong>⚠️ Username Expiration Policy:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Your username expires every 30 days</li>
                <li>• You have 15 days after expiration to renew</li>
                <li>• If not renewed, your account becomes anonymous</li>
                <li>• Your username becomes available for others to purchase</li>
                <li>• Others can access rooms you created</li>
              </ul>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise}>
            <RegistrationForm />
          </Elements>
        </CardContent>
      </Card>
    </div>
  );
}