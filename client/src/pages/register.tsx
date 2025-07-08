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

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const RegistrationForm = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
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

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/register-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Complete registration
        await apiRequest("POST", "/api/complete-registration", {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        
        toast({
          title: "Success",
          description: "Account created successfully! Please check your email to verify your account.",
        });
        
        setLocation("/login");
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

  if (step === 'payment') {
    return (
      <form onSubmit={handlePaymentSubmit} className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Complete Your Registration</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Username: <span className="font-medium">{formData.username}</span>
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
            onClick={() => setStep('details')}
            disabled={isProcessing}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="flex-1"
          >
            {isProcessing ? "Processing..." : "Complete Registration"}
          </Button>
        </div>
      </form>
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