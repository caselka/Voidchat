import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, Palette, Type, Clock, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { isUnauthorizedError } from '@/lib/authUtils';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ themeData, bundle }: { themeData: any; bundle: string }) => {
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
        description: "Your theme customization is now active!",
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

export default function Themes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [background, setBackground] = useState('dark');
  const [font, setFont] = useState('monospace');
  const [accentColor, setAccentColor] = useState('default');
  const [messageFadeTime, setMessageFadeTime] = useState([15]);
  const [backgroundFx, setBackgroundFx] = useState('none');
  const [bundle, setBundle] = useState('theme_only');
  const [clientSecret, setClientSecret] = useState('');
  const [currentTheme, setCurrentTheme] = useState<any>(null);
  const [step, setStep] = useState<'form' | 'payment'>('form');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "You need to log in to purchase theme customizations. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    // Check if user already has theme customization
    apiRequest('GET', '/api/my-theme')
      .then(res => res.json())
      .then(data => {
        if (data.theme) {
          setCurrentTheme(data.theme);
        }
      });
  }, []);

  const createPayment = async () => {
    try {
      const res = await apiRequest('POST', '/api/create-theme-payment', {
        background,
        font,
        accentColor,
        messageFadeTime: messageFadeTime[0],
        backgroundFx,
        bundle
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

  const bundleInfo = {
    theme_only: { price: '$2', description: 'Theme customization only' },
    drift_premium: { price: '$7', description: 'Theme + Custom Handle (30 days)' },
    void_guardian: { price: '$10', description: 'Everything + Guardian Powers (7 days)' }
  };

  if (currentTheme) {
    return (
      <div className="min-h-screen bg-void-50 dark:bg-void-900 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Link href="/chat">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Your Theme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-void-600 dark:text-void-400">Background:</span>
                  <div className="font-medium capitalize">{currentTheme.background}</div>
                </div>
                <div>
                  <span className="text-void-600 dark:text-void-400">Font:</span>
                  <div className="font-medium capitalize">{currentTheme.font}</div>
                </div>
                <div>
                  <span className="text-void-600 dark:text-void-400">Accent:</span>
                  <div className="font-medium capitalize">{currentTheme.accentColor}</div>
                </div>
                <div>
                  <span className="text-void-600 dark:text-void-400">Message Fade:</span>
                  <div className="font-medium">{currentTheme.messageFadeTime} min</div>
                </div>
              </div>
              <div className="text-center">
                <Badge variant="secondary">Active</Badge>
              </div>
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
              <div className="mb-4 p-3 bg-void-100 dark:bg-void-800 rounded space-y-2">
                <div className="flex justify-between">
                  <span>Bundle:</span>
                  <span className="capitalize">{bundle.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>{bundleInfo[bundle as keyof typeof bundleInfo].price}</span>
                </div>
              </div>
              
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm themeData={{ background, font, accentColor, messageFadeTime: messageFadeTime[0], backgroundFx }} bundle={bundle} />
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
            <CardTitle className="flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Theme Customization
            </CardTitle>
            <p className="text-sm text-void-600 dark:text-void-400">
              Customize your chat experience with personal themes and colors
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Background */}
            <div className="space-y-3">
              <Label className="flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Background
              </Label>
              <Select value={background} onValueChange={setBackground}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="midnight">Midnight Blue</SelectItem>
                  <SelectItem value="vaporwave">Vaporwave</SelectItem>
                  <SelectItem value="cream">Coffee Cream</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font */}
            <div className="space-y-3">
              <Label className="flex items-center">
                <Type className="w-4 h-4 mr-2" />
                Font Style
              </Label>
              <Select value={font} onValueChange={setFont}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monospace">Monospace (Default)</SelectItem>
                  <SelectItem value="typewriter">Typewriter</SelectItem>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="cyber">Cyber</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Accent Color */}
            <div className="space-y-3">
              <Label>Accent Color</Label>
              <Select value={accentColor} onValueChange={setAccentColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="pastels">Muted Pastels</SelectItem>
                  <SelectItem value="grey">Grey</SelectItem>
                  <SelectItem value="rust">Dust Red</SelectItem>
                  <SelectItem value="ocean">Ocean Blue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message Fade Time */}
            <div className="space-y-3">
              <Label className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Message Fade Time: {messageFadeTime[0]} minutes
              </Label>
              <Slider
                value={messageFadeTime}
                onValueChange={setMessageFadeTime}
                min={5}
                max={30}
                step={5}
                className="w-full"
              />
            </div>

            {/* Background Effects */}
            <div className="space-y-3">
              <Label className="flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                Background Effects
              </Label>
              <Select value={backgroundFx} onValueChange={setBackgroundFx}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="noise">Subtle Noise</SelectItem>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="gradient">Gradient Drift</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bundle Selection */}
            <div className="space-y-3">
              <Label>Choose Your Bundle</Label>
              <RadioGroup value={bundle} onValueChange={setBundle}>
                {Object.entries(bundleInfo).map(([key, info]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <RadioGroupItem value={key} id={key} />
                    <Label htmlFor={key} className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium capitalize">{key.replace('_', ' ')}</div>
                          <div className="text-xs text-void-600 dark:text-void-400">{info.description}</div>
                        </div>
                        <span className="font-medium">{info.price}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button onClick={createPayment} className="w-full">
              Purchase Bundle - {bundleInfo[bundle as keyof typeof bundleInfo].price}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}