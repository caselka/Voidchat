import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Shield, Palette, Clock, Star, ArrowRight } from "lucide-react";
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
            Anonymous real-time conversations that fade into the void
          </p>
          <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
            Join ephemeral discussions where messages disappear after 15 minutes. 
            Chat freely without accounts, or unlock premium features including custom themes, 
            reserved usernames, and moderation powers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/chat">
              <Button size="lg" className="text-lg px-8 py-6">
                <MessageCircle className="mr-2 h-5 w-5" />
                Start Chatting Anonymously
              </Button>
            </Link>
            
            {!isAuthenticated ? (
              <div className="flex flex-col gap-4 items-center">
                <div className="flex gap-4">
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6"
                    onClick={() => window.location.href = "/register"}
                  >
                    <Star className="mr-2 h-5 w-5" />
                    Sign Up ($3)
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
                  <strong>New users:</strong> Create your account for $3 to reserve your username<br/>
                  <strong>Returning users:</strong> Sign in to access your premium features
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 items-center">
                <div className="text-lg text-muted-foreground">
                  Welcome back, {user?.username || user?.firstName || user?.email?.split('@')[0] || 'user'}!
                </div>
                <Link href="/handle">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                    <Star className="mr-2 h-5 w-5" />
                    Manage Premium Features
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
          <h2 className="text-4xl font-light mb-4">Features</h2>
          <p className="text-xl text-muted-foreground">
            Simple, ephemeral, and beautifully minimal
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">Ephemeral Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                All messages automatically disappear after 15 minutes. No permanent record, just the moment.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">Anonymous by Default</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Join conversations instantly without registration. Your privacy is protected by design.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">Guardian Moderation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Paid moderators ensure quality conversations. Become a Guardian to help maintain the space.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-xl">Custom Themes</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Personalize your void with custom colors, fonts, and visual effects.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Authentication Info Section */}
      {!isAuthenticated && (
        <div className="container mx-auto px-4 py-8 bg-muted/20">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-light mb-4">Quick & Secure Account Creation</h3>
            <p className="text-muted-foreground mb-6">
              Join in seconds with our secure authentication system.
            </p>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-2">
                <h4 className="font-medium">New Users:</h4>
                <p className="text-sm text-muted-foreground">
                  Create your free account instantly. No credit card required to start chatting.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Existing Users:</h4>
                <p className="text-sm text-muted-foreground">
                  Sign in with your account to access premium features and saved preferences.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Features */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-light mb-4">Premium Features</h2>
          <p className="text-xl text-muted-foreground">
            Reserve your identity in the void
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="relative">
            <CardHeader>
              <Badge variant="secondary" className="w-fit">Popular</Badge>
              <CardTitle className="text-2xl">Custom Handle</CardTitle>
              <CardDescription>Reserve your unique username</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-light">$1-3</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Permanent username reservation</li>
                  <li>• Stand out in conversations</li>
                  <li>• 7-30 day validity options</li>
                </ul>
                {!isAuthenticated ? (
                  <Button className="w-full" onClick={() => window.location.href = "/register"}>
                    Sign Up to Reserve Handle
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Link href="/handle">
                    <Button className="w-full">
                      Reserve Handle
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Theme Customization</CardTitle>
              <CardDescription>Personalize your void aesthetic</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-light">$2-10</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Custom color schemes</li>
                  <li>• Font selection</li>
                  <li>• Visual effects</li>
                  <li>• Bundle with Guardian access</li>
                </ul>
                {!isAuthenticated ? (
                  <Button className="w-full" variant="outline" onClick={() => window.location.href = "/register"}>
                    Sign Up for Themes
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Link href="/themes">
                    <Button className="w-full" variant="outline">
                      Customize Theme
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Badge variant="outline" className="w-fit">Community</Badge>
              <CardTitle className="text-2xl">Room Creation</CardTitle>
              <CardDescription>Create permanent chat rooms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-light">$49</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Create permanent rooms</li>
                  <li>• Moderation privileges in your room</li>
                  <li>• Customize room settings</li>
                  <li>• Build your community</li>
                </ul>
                {!isAuthenticated ? (
                  <Button className="w-full" variant="outline" onClick={() => window.location.href = "/register"}>
                    Sign Up to Create Rooms
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Link href="/create-room">
                    <Button className="w-full" variant="outline">
                      Create Room
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-medium mb-4">Product</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/chat">Anonymous Chat</Link></li>
                  <li><Link href="/handle">Custom Handles</Link></li>
                  <li><Link href="/themes">Theme Customization</Link></li>
                  <li><Link href="/guardian">Guardian Program</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/careers">Careers</Link></li>
                  <li><Link href="/contact">Contact Us</Link></li>
                  <li><Link href="/sponsor">Sponsor</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/privacy">Privacy Policy</Link></li>
                  <li><Link href="/terms">Terms of Service</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-4">Support</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="mailto:help@voidchat.com">Help Center</a></li>
                  <li><a href="mailto:safety@voidchat.com">Safety</a></li>
                </ul>
              </div>
            </div>
            <div className="text-center pt-8 border-t border-border">
              <p className="text-muted-foreground">
                voidchat - where conversations fade into the beautiful void
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}