import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Megaphone } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const sponsorSchema = z.object({
  productName: z.string().min(1, "Product name is required").max(30, "Max 30 characters"),
  description: z.string().min(1, "Description is required").max(80, "Max 80 characters"),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type SponsorForm = z.infer<typeof sponsorSchema>;

const CheckoutForm = ({ adData, duration }: { adData: SponsorForm; duration: string }) => {
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
        await apiRequest("POST", "/api/submit-sponsor-ad", {
          ...adData,
          duration,
          paymentIntentId: paymentIntent.id
        });

        toast({
          title: "Payment Successful",
          description: "Your ambient ad will start appearing in the chat soon!",
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

export default function Sponsor() {
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [selectedDuration, setSelectedDuration] = useState<'day' | 'week'>('day');
  const [clientSecret, setClientSecret] = useState("");
  const [adData, setAdData] = useState<SponsorForm | null>(null);
  const { toast } = useToast();

  const form = useForm<SponsorForm>({
    resolver: zodResolver(sponsorSchema),
    defaultValues: {
      productName: "",
      description: "",
      url: "",
    },
  });

  const onSubmit = async (data: SponsorForm) => {
    try {
      const response = await apiRequest("POST", "/api/create-sponsor-payment", { 
        duration: selectedDuration 
      });
      const result = await response.json();
      
      setClientSecret(result.clientSecret);
      setAdData(data);
      setStep('payment');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize payment",
        variant: "destructive",
      });
    }
  };

  const previewText = form.watch();

  return (
    <div className="min-h-screen bg-void-50 dark:bg-void-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
        </div>

        {step === 'form' ? (
          <>
            <Card className="mb-6 bg-white dark:bg-void-800 border-void-300 dark:border-void-700">
              <CardHeader>
                <CardTitle className="flex items-center text-void-900 dark:text-void-100">
                  <Megaphone className="w-5 h-5 mr-2 text-blue-500" />
                  Sponsor the Room
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-void-600 dark:text-void-400 mb-4">
                  Your ambient ad will appear every 20 messages as a subtle, poetic insertion in the chat flow.
                </p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="productName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-void-700 dark:text-void-300">Product/Service Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Midnight Coffee Co." 
                              {...field}
                              className="bg-white dark:bg-void-700 border-void-300 dark:border-void-600"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-void-700 dark:text-void-300">Poetic Description</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Where insomniacs find their perfect brew" 
                              {...field}
                              className="bg-white dark:bg-void-700 border-void-300 dark:border-void-600"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-void-700 dark:text-void-300">Website (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="url" 
                              placeholder="https://midnight-coffee.com" 
                              {...field}
                              className="bg-white dark:bg-void-700 border-void-300 dark:border-void-600"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Preview */}
                    {(previewText.productName || previewText.description) && (
                      <div className="bg-void-100 dark:bg-void-700 rounded-lg p-4">
                        <div className="text-xs text-void-600 dark:text-void-400 mb-2">Preview:</div>
                        <div className="font-mono text-sm italic text-void-600 dark:text-void-500">
                          ✦ Try: "{previewText.productName}" – {previewText.description}
                          {previewText.url && (
                            <span className="text-blue-500 underline ml-1">{previewText.url}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Duration Selection */}
                    <div className="space-y-3">
                      <div 
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedDuration === 'day' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-void-300 dark:border-void-600 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                        onClick={() => setSelectedDuration('day')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">24 hours (≈100 impressions)</span>
                          <span className="font-medium">$15</span>
                        </div>
                      </div>
                      
                      <div 
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedDuration === 'week' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-void-300 dark:border-void-600 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                        onClick={() => setSelectedDuration('week')}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">7 days (≈700 impressions)</span>
                          <span className="font-medium">$75</span>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      Continue to Payment
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-white dark:bg-void-800 border-void-300 dark:border-void-700">
            <CardHeader>
              <CardTitle className="text-void-900 dark:text-void-100">Complete Your Sponsorship</CardTitle>
            </CardHeader>
            <CardContent>
              {clientSecret && adData && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm adData={adData} duration={selectedDuration} />
                </Elements>
              )}
              
              <div className="text-xs text-void-500 dark:text-void-400 text-center mt-4">
                Payments processed securely via Stripe
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
