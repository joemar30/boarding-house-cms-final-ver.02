import { useState } from "react";
import { usePhpAuth } from "@/contexts/PhpAuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { phpUsers } from "@/lib/phpApi";
import { User, Lock, Building2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import MotionPage from "@/components/MotionPage";

export default function AdminSettings() {
  const { user } = usePhpAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
  });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await phpUsers.updateProfile(profileForm);
      toast.success('Profile updated successfully');
    } catch (e: any) {
      toast.error(e.message ?? 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPw(true);
    try {
      await phpUsers.updateProfile({ password: passwordForm.password });
      toast.success('Password updated successfully');
      setPasswordForm({ password: '', confirm: '' });
    } catch (e: any) {
      toast.error(e.message ?? 'Update failed');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <MotionPage className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground transition-all duration-300">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Account Info */}
      <Card className="p-6 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg leading-tight">Profile Information</h2>
            <p className="text-sm text-muted-foreground">Update your personal details</p>
          </div>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-muted/40 border border-border/50">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Role:</span>
          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
            user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
            user?.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}>{user?.role}</span>
          <span className="text-xs font-medium text-muted-foreground ml-auto pr-1">{user?.email}</span>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
              <input type="text" value={profileForm.name}
                onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2 border border-input rounded-xl bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/20 outline-none h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
              <input type="tel" value={profileForm.phone}
                onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-input rounded-xl bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/20 outline-none h-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Physical Address</label>
            <textarea value={profileForm.address} rows={3}
              onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))}
              className="w-full px-4 py-3 border border-input rounded-xl bg-background text-foreground resize-none transition-all focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Enter your complete address..."
            />
          </div>
          <Button type="submit" className="font-bold h-11 px-8 rounded-xl" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Profile Changes'}
          </Button>
        </form>
      </Card>

      {/* Change Password */}
      <Card className="p-6 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-semibold text-lg">Security & Password</h2>
        </div>
        <form onSubmit={handlePasswordSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Password</label>
              <input type="password" value={passwordForm.password} placeholder="••••••••"
                onChange={e => setPasswordForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-2 border border-input rounded-xl bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/20 outline-none h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm Password</label>
              <input type="password" value={passwordForm.confirm} placeholder="••••••••"
                onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                className="w-full px-4 py-2 border border-input rounded-xl bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/20 outline-none h-11"
              />
            </div>
          </div>
          <Button type="submit" variant="outline" className="font-bold h-11 px-8 rounded-xl" disabled={savingPw}>
            {savingPw ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </Card>

      {/* System Info */}
      <Card className="p-6 transition-all duration-300 hover:shadow-md border-dashed">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-primary opacity-60" />
          </div>
          <h2 className="font-semibold text-lg">System Audit Info</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[
            { label: 'Application', value: 'Boarding House CMS' },
            { label: 'Engine', value: 'React 19 + Vite' },
            { label: 'Backend', value: 'PHP 8.x REST API' },
            { label: 'Design', value: 'Lucid Morphic' },
            { label: 'Status', value: 'Optimized' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 sm:last:border-b">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label}</span>
              <span className="font-semibold text-xs">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </MotionPage>
  );
}
