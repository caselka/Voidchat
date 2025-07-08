import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Clock, Database, UserX, Lock } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-light mb-6 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xl text-muted-foreground mb-8 font-light max-w-2xl mx-auto">
              Your privacy is fundamental to how we built voidchat. Here's exactly how we protect it.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: July 8, 2025
            </p>
          </div>

          {/* Key Principles */}
          <div className="mb-16">
            <h2 className="text-3xl font-light mb-8 text-center">Our Privacy Principles</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-xl">Ephemeral by Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    All messages automatically delete after 15 minutes. No permanent conversation storage.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <UserX className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-xl">Anonymous First</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Chat without accounts. No tracking or profiling of anonymous users.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-xl">Minimal Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    We only collect what's necessary for basic functionality and payments.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Policy */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Database className="h-5 w-5" />
                  Information We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Anonymous Chat Users</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• IP address (for rate limiting and spam prevention only)</li>
                    <li>• Message content (deleted after 15 minutes)</li>
                    <li>• Temporary session data (cleared when you leave)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Authenticated Users (Premium Features)</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Email address (from Replit authentication)</li>
                    <li>• Display name and profile image (if provided)</li>
                    <li>• Payment information (processed securely by Stripe)</li>
                    <li>• Custom handle and theme preferences</li>
                    <li>• Guardian moderation actions (for accountability)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Eye className="h-5 w-5" />
                  How We Use Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Essential Functions</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Deliver real-time messages between users</li>
                    <li>• Prevent spam and abuse through rate limiting</li>
                    <li>• Process payments for premium features</li>
                    <li>• Provide Guardian moderation capabilities</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">What We Don't Do</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Sell your data to third parties</li>
                    <li>• Use your messages for advertising or analytics</li>
                    <li>• Track your behavior across other websites</li>
                    <li>• Store conversation history beyond 15 minutes</li>
                    <li>• Profile users for any commercial purpose</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5" />
                  Data Protection & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Technical Safeguards</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• All data encrypted in transit using HTTPS/WSS</li>
                    <li>• Database stored on secure, compliant infrastructure</li>
                    <li>• Regular security audits and updates</li>
                    <li>• Minimal data retention with automatic deletion</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Access Controls</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Limited team access to user data</li>
                    <li>• All access logged and monitored</li>
                    <li>• No employee access to message content</li>
                    <li>• Payment data handled exclusively by Stripe</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Automatic Deletion</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Chat messages: Deleted after 15 minutes</li>
                    <li>• Anonymous session data: Cleared when you disconnect</li>
                    <li>• Rate limiting data: Cleared after 24 hours</li>
                    <li>• Expired premium features: Deleted when subscription ends</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Persistent Data (Authenticated Users Only)</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Account information: Until account deletion</li>
                    <li>• Payment records: 7 years (legal requirement)</li>
                    <li>• Guardian action logs: 90 days (for moderation accountability)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">For Authenticated Users</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Access your personal data</li>
                    <li>• Correct inaccurate information</li>
                    <li>• Delete your account and associated data</li>
                    <li>• Export your data (custom handles, preferences)</li>
                    <li>• Withdraw consent for data processing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Contact Us</h4>
                  <p className="text-sm text-muted-foreground">
                    To exercise your rights or ask questions about your privacy, contact us at{" "}
                    <span className="font-medium">privacy@voidchat.com</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Third-Party Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Services We Use</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• <span className="font-medium">Replit:</span> Authentication service (their privacy policy applies)</li>
                    <li>• <span className="font-medium">Stripe:</span> Payment processing (their privacy policy applies)</li>
                    <li>• <span className="font-medium">Neon:</span> Database hosting (data processing agreement in place)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Data Sharing</h4>
                  <p className="text-sm text-muted-foreground">
                    We only share data with these services as necessary for functionality. 
                    We never sell or share your data for marketing or advertising purposes.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Changes to This Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We may update this privacy policy occasionally. Significant changes will be 
                  announced in the app and via email to authenticated users. Continued use 
                  constitutes acceptance of any updates.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact */}
          <div className="mt-16 text-center p-8 bg-muted/30 rounded-lg">
            <h3 className="text-xl font-medium mb-4">Questions About Privacy?</h3>
            <p className="text-muted-foreground mb-4">
              We believe privacy should be simple and transparent. If anything isn't clear, 
              we're here to help.
            </p>
            <p className="font-medium">privacy@voidchat.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}