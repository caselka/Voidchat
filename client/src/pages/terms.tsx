import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Scale, AlertTriangle, Shield } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-light mb-6 tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xl text-muted-foreground mb-8 font-light max-w-2xl mx-auto">
              Simple, fair terms for using voidchat. We believe in transparency and treating our users with respect.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: July 8, 2025
            </p>
          </div>

          {/* Key Points */}
          <div className="mb-16">
            <h2 className="text-3xl font-light mb-8 text-center">Key Points</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-lg">Simple Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Be respectful, don't spam, and respect others' privacy.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-lg">Fair Use</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Use voidchat for personal communication, not commercial spam.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-lg">No Liability</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Messages disappear automatically. We're not responsible for lost content.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="text-lg">Moderation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Guardian moderators help maintain a respectful environment.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Terms */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  By using voidchat, you agree to these terms. If you don't agree, please don't use our service. 
                  We may update these terms occasionally, and continued use means you accept any changes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Service Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">What voidchat is:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• A real-time chat platform where messages automatically delete after 15 minutes</li>
                    <li>• Anonymous chat available without registration</li>
                    <li>• Premium features available with paid accounts</li>
                    <li>• Guardian moderation system to maintain quality conversations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">What voidchat is not:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• A permanent messaging or file storage service</li>
                    <li>• A platform for illegal activity or harassment</li>
                    <li>• A guarantee of 100% uptime or message delivery</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Acceptable Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">You may use voidchat to:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Have respectful conversations with others</li>
                    <li>• Share ideas, thoughts, and appropriate content</li>
                    <li>• Purchase and use premium features as intended</li>
                    <li>• Report inappropriate behavior to moderators</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">You may not use voidchat to:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Harass, threaten, or abuse other users</li>
                    <li>• Share illegal content, spam, or malicious links</li>
                    <li>• Attempt to hack, exploit, or disrupt the service</li>
                    <li>• Impersonate others or create misleading accounts</li>
                    <li>• Use automated tools to spam or overwhelm the service</li>
                    <li>• Share personal information of others without consent</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Account and Payment Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Anonymous Users</h4>
                  <p className="text-sm text-muted-foreground">
                    No account required. Subject to rate limiting and IP-based moderation.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Premium Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Require authentication through Replit</li>
                    <li>• All payments processed securely through Stripe</li>
                    <li>• No refunds for completed purchases (features expire as stated)</li>
                    <li>• Custom handles and themes expire as specified at purchase</li>
                    <li>• Guardian access ends when subscription expires</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Account Termination</h4>
                  <p className="text-sm text-muted-foreground">
                    We reserve the right to terminate accounts for violations of these terms. 
                    You can delete your account at any time through the settings or by contacting us.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Content and Moderation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Your Content</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• You retain ownership of your messages and content</li>
                    <li>• Messages automatically delete after 15 minutes</li>
                    <li>• You're responsible for the content you share</li>
                    <li>• You grant us permission to transmit your messages to other users</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Moderation</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Guardian moderators can delete messages and mute users</li>
                    <li>• Automated systems prevent spam and rate limit messages</li>
                    <li>• We may investigate reported violations</li>
                    <li>• Severe violations may result in IP or account bans</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Privacy and Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your privacy is important to us. Please review our{" "}
                  <a href="/privacy" className="underline font-medium">Privacy Policy</a>{" "}
                  for detailed information about how we collect, use, and protect your data.
                </p>
                <div>
                  <h4 className="font-medium mb-2">Key Privacy Points:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Messages automatically delete after 15 minutes</li>
                    <li>• Anonymous users aren't tracked or profiled</li>
                    <li>• We only collect data necessary for functionality</li>
                    <li>• No selling of user data to third parties</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Disclaimers and Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Service Availability</h4>
                  <p className="text-sm text-muted-foreground">
                    We provide voidchat "as is" without guarantees of uptime, performance, or availability. 
                    We may experience downtime for maintenance or technical issues.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Message Delivery</h4>
                  <p className="text-sm text-muted-foreground">
                    While we strive for reliable real-time messaging, we cannot guarantee message delivery. 
                    Messages may be lost due to technical issues, network problems, or service disruptions.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Limitation of Liability</h4>
                  <p className="text-sm text-muted-foreground">
                    Our total liability for any claims related to voidchat is limited to the amount you've 
                    paid us in the past 12 months. We're not liable for indirect damages, lost profits, 
                    or data loss.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Our Rights</h4>
                  <p className="text-sm text-muted-foreground">
                    The voidchat service, including its design, code, and branding, is our intellectual property. 
                    You may not copy, modify, or redistribute our service.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Your Rights</h4>
                  <p className="text-sm text-muted-foreground">
                    You retain ownership of your content. You grant us a license to transmit and display 
                    your messages as part of the service functionality.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Governing Law</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  These terms are governed by the laws of Delaware, United States. 
                  Any disputes will be resolved through binding arbitration.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Changes to Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We may update these terms occasionally to reflect changes in our service or legal requirements. 
                  We'll notify users of significant changes through the app and email (for authenticated users). 
                  Continued use after changes means you accept the updated terms.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact */}
          <div className="mt-16 text-center p-8 bg-muted/30 rounded-lg">
            <h3 className="text-xl font-medium mb-4">Questions About These Terms?</h3>
            <p className="text-muted-foreground mb-4">
              We believe terms should be clear and fair. If you have questions or concerns, 
              we're here to help clarify anything.
            </p>
            <p className="font-medium">legal@voidchat.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}