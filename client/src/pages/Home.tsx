import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { CheckCircle2, FileText, Users, BarChart3, Bell, Zap } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // Redirect authenticated users to their dashboard
    const userRole = user.role === "admin" ? "admin" : "tenant";
    setLocation(`/${userRole}/dashboard`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Navigation */}
      <nav className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-lg">Boarding House Complaint Manager</span>
          </div>
          <Button onClick={() => window.location.href = getLoginUrl()}>
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Streamline Your Complaint Management
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            An elegant and intuitive system for managing boarding house complaints. Connect tenants, staff, and administrators in one unified platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => window.location.href = getLoginUrl()}
              className="gap-2"
            >
              <Zap className="h-5 w-5" />
              Get Started
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Easy Submission</h3>
            <p className="text-muted-foreground">
              Tenants can submit complaints with categorization, priority levels, and file attachments in seconds.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Status Tracking</h3>
            <p className="text-muted-foreground">
              Real-time status updates with visual indicators for Pending, In Progress, Resolved, and Rejected states.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Staff Management</h3>
            <p className="text-muted-foreground">
              Assign complaints to staff members with deadlines, progress tracking, and completion proof uploads.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Analytics</h3>
            <p className="text-muted-foreground">
              Comprehensive admin dashboard with analytics, reports, and system performance monitoring.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Notifications</h3>
            <p className="text-muted-foreground">
              Real-time notifications for complaint updates, assignments, and status changes.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Role-Based Access</h3>
            <p className="text-muted-foreground">
              Dedicated portals for Tenants, Staff, and Admins with tailored functionality for each role.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 border-t border-border/50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your complaint management?</h2>
          <p className="text-muted-foreground mb-8">
            Join our platform and experience a more efficient way to handle boarding house complaints.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = getLoginUrl()}
            className="gap-2"
          >
            <Zap className="h-5 w-5" />
            Sign In Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              © 2026 Boarding House Complaint Management System. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
