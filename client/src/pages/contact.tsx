import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Bug, Shield, Briefcase } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message Sent",
        description: "We'll get back to you within 24 hours.",
      });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-light mb-6 tracking-tight">
              Contact Us
            </h1>
            <p className="text-xl text-muted-foreground mb-8 font-light max-w-2xl mx-auto">
              Questions, feedback, or just want to say hello? We'd love to hear from you. 
              Your voice helps us make the void a better place for everyone.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Methods */}
            <div className="space-y-6">
              <h2 className="text-3xl font-light mb-8">Get in Touch</h2>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">General Inquiries</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-2">
                      Questions about features, partnerships, or general feedback
                    </CardDescription>
                    <p className="font-medium">hello@voidchat.com</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Bug className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">Technical Support</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-2">
                      Bug reports, technical issues, or account problems
                    </CardDescription>
                    <p className="font-medium">support@voidchat.com</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">Safety & Moderation</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-2">
                      Report harassment, abuse, or inappropriate content
                    </CardDescription>
                    <p className="font-medium">safety@voidchat.com</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">Press & Media</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-2">
                      Media inquiries, interviews, and press releases
                    </CardDescription>
                    <p className="font-medium">press@voidchat.com</p>
                  </CardContent>
                </Card>
              </div>

              {/* Response Time */}
              <div className="p-6 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Response Times</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• General inquiries: 24-48 hours</li>
                  <li>• Technical support: 12-24 hours</li>
                  <li>• Safety reports: Within 6 hours</li>
                  <li>• Press inquiries: 48-72 hours</li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-light mb-8">Send a Message</h2>
              
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Your name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email"
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input 
                        id="subject" 
                        placeholder="What's this about?"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message"
                        placeholder="Tell us what's on your mind..."
                        rows={6}
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}