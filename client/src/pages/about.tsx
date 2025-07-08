import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Shield, Users, Clock } from "lucide-react";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
          <h1 className="text-4xl font-light tracking-tight">About Voidchat</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Anonymous real-time conversations that vanish into the void
          </p>
        </div>

        <div className="grid gap-6">
          {/* Mission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="mr-2 h-5 w-5" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Voidchat provides a minimalist space for ephemeral conversations. Like a public notepad 
                in the digital void, messages exist briefly before vanishing forever. We believe in the 
                power of temporary thoughts, fleeting connections, and the beauty of impermanence in 
                our hyper-connected world.
              </p>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Ephemeral Messages
                </CardTitle>
                <CardDescription>
                  Messages automatically expire after 15 minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Every message has a lifespan. This creates a unique dynamic where conversations 
                  are present-focused and authentic, free from the weight of permanent records.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Anonymous by Default
                </CardTitle>
                <CardDescription>
                  Chat without accounts or permanent identity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Join conversations instantly as an anonymous user. No signup required, 
                  no permanent digital footprint. Just pure, unfiltered communication.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Guardian Moderation
                </CardTitle>
                <CardDescription>
                  Community-powered moderation system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Paid Guardians help maintain a healthy chat environment with moderation 
                  tools, ensuring conversations remain constructive and respectful.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Premium Features</CardTitle>
                <CardDescription>
                  Enhanced experience for registered users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Reserve custom usernames, create permanent chat rooms, customize themes, 
                  and access Guardian moderation privileges with paid accounts.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Philosophy */}
          <Card>
            <CardHeader>
              <CardTitle>Design Philosophy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Minimalism</h4>
                <p className="text-sm text-muted-foreground">
                  Clean, distraction-free interface that focuses on what matters: the conversation.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Impermanence</h4>
                <p className="text-sm text-muted-foreground">
                  Messages that fade away encourage authentic, in-the-moment communication.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Accessibility</h4>
                <p className="text-sm text-muted-foreground">
                  Anyone can join instantly, with optional paid features for enhanced experiences.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Community</h4>
                <p className="text-sm text-muted-foreground">
                  Self-moderating community with tools to maintain positive interactions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Approach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <h5 className="font-medium text-foreground mb-1">Real-time Communication</h5>
                  <p>WebSocket-powered instant messaging with minimal latency</p>
                </div>
                <div>
                  <h5 className="font-medium text-foreground mb-1">Data Privacy</h5>
                  <p>Automatic message deletion and minimal data retention</p>
                </div>
                <div>
                  <h5 className="font-medium text-foreground mb-1">Scalable Architecture</h5>
                  <p>Built on modern web technologies for reliable performance</p>
                </div>
                <div>
                  <h5 className="font-medium text-foreground mb-1">Security First</h5>
                  <p>Content filtering and spam protection for safe conversations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="text-center">
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-2">Ready to join the conversation?</h3>
              <p className="text-muted-foreground mb-4">
                Start chatting anonymously or create an account for premium features
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/">
                  <Button>
                    Start Chatting
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline">
                    Create Account ($3)
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}