import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Users } from "lucide-react";

const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const RoomPaymentForm = ({ clientSecret, roomName }: { clientSecret: string; roomName: string }) => {
  const [, setLocation] = useLocation();
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
        try {
          const response = await apiRequest("POST", "/api/complete-room-creation", {
            paymentIntentId: paymentIntent.id,
          });
          const result = await response.json();
          
          toast({
            title: "Room Created!",
            description: `Room "${result.room.name}" created successfully!`,
          });
          
          setTimeout(() => {
            setLocation(`/room/${result.room.name}`);
          }, 1500);
        } catch (completionError: any) {
          toast({
            title: "Room Creation Error",
            description: completionError.message || "Failed to complete room creation",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Payment failed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Complete Room Creation</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Room: <span className="font-medium">{roomName}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Cost: <span className="font-medium">$49.00</span> (one-time room creation fee)
        </p>
      </div>
      
      <PaymentElement />
      
      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setLocation("/create-room")}
          disabled={isProcessing}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? "Processing..." : "Create Room ($49)"}
        </Button>
      </div>
    </form>
  );
};

export default function RoomCheckout() {
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const secret = urlParams.get('clientSecret');
    const name = urlParams.get('roomName');
    
    if (!secret || !name) {
      setLocation('/create-room');
      return;
    }
    
    setClientSecret(secret);
    setRoomName(name);
  }, [setLocation]);

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Payment Unavailable</h2>
            <p className="text-muted-foreground">
              Payment processing is currently unavailable. Please try again later.
            </p>
            <Button variant="outline" onClick={() => setLocation("/create-room")} className="mt-4">
              Back to Room Creation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret || !roomName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-md mx-auto pt-20">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Create Room</span>
            </CardTitle>
            <CardDescription>
              Complete your payment to create a permanent chat room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe'
                }
              }}
            >
              <RoomPaymentForm clientSecret={clientSecret} roomName={roomName} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}