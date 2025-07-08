import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Heart, Code, MessageCircle, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Careers() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-light mb-6 tracking-tight">
              Careers
            </h1>
            <p className="text-xl text-muted-foreground mb-8 font-light max-w-2xl mx-auto">
              Help us build the future of ephemeral communication. Join our mission to create 
              meaningful conversations that fade beautifully into the void.
            </p>
          </div>

          {/* Company Culture */}
          <div className="mb-16">
            <h2 className="text-3xl font-light mb-8 text-center">Why Voidchat?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-xl">Meaningful Work</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Build technology that prioritizes authentic human connection over metrics and engagement.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-xl">Remote First</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Work from anywhere with a small, focused team that values quality over quantity.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-xl">Innovation</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Push the boundaries of what digital communication can be in an age of information overload.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Open Positions */}
          <div className="mb-16">
            <h2 className="text-3xl font-light mb-8 text-center">Open Positions</h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl mb-2">Senior Full-Stack Engineer</CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Full-time</Badge>
                        <Badge variant="outline">Remote</Badge>
                        <Badge variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          Global
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base mb-4">
                    Lead the development of our real-time messaging infrastructure and help scale 
                    our anonymous communication platform to millions of users.
                  </CardDescription>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">What you'll do:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Design and implement WebSocket infrastructure for real-time messaging</li>
                        <li>• Build beautiful, responsive frontend experiences with React and TypeScript</li>
                        <li>• Optimize database performance for high-throughput message handling</li>
                        <li>• Collaborate on product vision and technical architecture decisions</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">What we're looking for:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• 5+ years experience with Node.js, React, and PostgreSQL</li>
                        <li>• Experience with real-time systems and WebSocket implementations</li>
                        <li>• Strong understanding of privacy and security best practices</li>
                        <li>• Passion for minimalist design and user experience</li>
                      </ul>
                    </div>
                  </div>
                  <Button className="mt-6">Apply Now</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl mb-2">Product Designer</CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Full-time</Badge>
                        <Badge variant="outline">Remote</Badge>
                        <Badge variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          Global
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base mb-4">
                    Shape the visual identity and user experience of ephemeral communication. 
                    Help us create interfaces that feel both minimal and deeply human.
                  </CardDescription>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">What you'll do:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Design intuitive interfaces for anonymous and authenticated experiences</li>
                        <li>• Create visual systems that support the "void" aesthetic</li>
                        <li>• Conduct user research to improve conversation quality</li>
                        <li>• Prototype new features for mobile and desktop platforms</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">What we're looking for:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• 3+ years experience in product design, preferably for social platforms</li>
                        <li>• Strong portfolio showcasing minimal, elegant design solutions</li>
                        <li>• Experience with design systems and component libraries</li>
                        <li>• Understanding of accessibility and inclusive design principles</li>
                      </ul>
                    </div>
                  </div>
                  <Button className="mt-6">Apply Now</Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* How to Apply */}
          <div className="text-center">
            <h2 className="text-3xl font-light mb-6">Ready to Join Us?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Don't see a perfect fit? We're always interested in talking to exceptional people. 
              Send us your story and let's explore how you might contribute to the void.
            </p>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Send your resume and a note about why you're interested to:
              </p>
              <p className="text-lg font-medium">careers@voidchat.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}