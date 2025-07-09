import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Shield, Clock, Star, ArrowRight, Users, Mail, Home, DollarSign, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import DynamicHeader from "@/components/dynamic-header";

export default function Landing() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DynamicHeader showHome={false} />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 pt-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-light mb-6 tracking-tight">
            voidchat
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 font-light">
            Secure anonymous messaging with premium features for serious users
          </p>
          <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
            Join real-time conversations where messages disappear after 15 minutes. 
            Chat anonymously for free, or unlock premium features including reserved usernames, 
            private rooms, direct messaging, and moderation tools.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/chat">
              <Button size="lg" className="text-lg px-8 py-6">
                <MessageCircle className="mr-2 h-5 w-5" />
                Start Chatting Now
              </Button>
            </Link>
            
            {!isAuthenticated ? (
              <div className="flex flex-col gap-4 items-center">
                <div className="flex gap-4">
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => window.location.href = "/register"}
                  >
                    <Star className="mr-2 h-5 w-5" />
                    Create Account ($3)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-lg px-8 py-6"
                    onClick={() => window.location.href = "/login"}
                  >
                    Sign In
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground max-w-md text-center">
                  Reserve your username for 30 days • Direct messaging • Room creation
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 items-center">
                <div className="text-lg text-muted-foreground">
                  Welcome back, {user?.username || user?.firstName || user?.email?.split('@')[0] || 'user'}!
                </div>
                <Link href="/chat">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Continue Chatting
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-light mb-4">Core Features</h2>
          <p className="text-xl text-muted-foreground">
            Built for privacy, designed for connection
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">15-Minute Expiration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Messages automatically disappear after 15 minutes. No permanent record, pure ephemeral conversation.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">Anonymous Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Join conversations instantly without registration. Complete privacy protection by design.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">Room System</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create permanent chat rooms for $49. Full moderation control and custom settings.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">Direct Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Private messaging for account holders. Secure conversations between registered users.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="container mx-auto px-4 py-16 bg-muted/20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-light mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-muted-foreground">
            Pay only for what you need, when you need it
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Anonymous</CardTitle>
              <CardDescription>No account needed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-light mb-4">Free</div>
              <ul className="space-y-2 text-sm text-muted-foreground text-left">
                <li>• Instant access to global chat</li>
                <li>• Auto-generated usernames</li>
                <li>• 15-minute message expiration</li>
                <li>• Basic spam protection</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-blue-500">
            <CardHeader>
              <Badge className="w-fit bg-blue-500 text-white">Most Popular</Badge>
              <CardTitle className="text-2xl">Account</CardTitle>
              <CardDescription>Reserved username</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-light mb-4">$3</div>
              <ul className="space-y-2 text-sm text-muted-foreground text-left">
                <li>• Reserved username for 30 days</li>
                <li>• Direct messaging access</li>
                <li>• Room creation ability</li>
                <li>• 15-day renewal grace period</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Room Creator</CardTitle>
              <CardDescription>Your own space</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-light mb-4">$49</div>
              <ul className="space-y-2 text-sm text-muted-foreground text-left">
                <li>• Create permanent room</li>
                <li>• Full moderation control</li>
                <li>• Custom room settings</li>
                <li>• Ban/mute capabilities</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Guardian</CardTitle>
              <CardDescription>Moderation powers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-light mb-4">$20/day</div>
              <ul className="space-y-2 text-sm text-muted-foreground text-left">
                <li>• Global moderation access</li>
                <li>• Message deletion rights</li>
                <li>• User muting abilities</li>
                <li>• Requires account history</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Security & Privacy */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-light mb-4">Security & Privacy</h2>
          <p className="text-xl text-muted-foreground">
            Built with privacy-first principles
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">End-to-End Security</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                All communications are encrypted in transit. No permanent message storage beyond the 15-minute window.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">Anonymous by Design</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                No IP logging, no tracking cookies, no data collection. Your privacy is protected by architecture.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">Transparent Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Pay only for features you use. No hidden fees, no subscriptions, no surprise charges.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call to Action */}
      <div className="container mx-auto px-4 py-16 bg-muted/10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-light mb-4">Ready to Join the Void?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start chatting instantly, or create an account to unlock premium features
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/chat">
              <Button size="lg" className="text-lg px-8 py-6">
                <MessageCircle className="mr-2 h-5 w-5" />
                Start Chatting Now
              </Button>
            </Link>
            {!isAuthenticated && (
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6"
                onClick={() => window.location.href = "/register"}
              >
                <Star className="mr-2 h-5 w-5" />
                Create Account ($3)
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-medium mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/chat" className="hover:text-foreground">Chat</Link></li>
                <li><Link href="/register" className="hover:text-foreground">Create Account</Link></li>
                <li><Link href="/login" className="hover:text-foreground">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Anonymous Chat</li>
                <li>Direct Messages</li>
                <li>Room Creation</li>
                <li>Guardian Moderation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 voidchat. Built for privacy, designed for connection.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}