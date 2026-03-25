import { useEffect, useState } from "react";
import { usePhpAuth } from "@/contexts/PhpAuthContext";
import { Card } from "@/components/ui/card";
import { phpComplaints, phpUsers, type PhpComplaint } from "@/lib/phpApi";
import { AlertCircle, CheckCircle2, Users, FileText, Clock, TrendingUp, Sparkles, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import PriorityBadge from "@/components/PriorityBadge";
import MotionPage from "@/components/MotionPage";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const { user } = usePhpAuth();
  const [, setLocation] = useLocation();
  const [complaints, setComplaints] = useState<PhpComplaint[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, resolved: 0, rejected: 0 });
  const [userStats, setUserStats] = useState({ total: 0, admins: 0, staff: 0, tenants: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      phpComplaints.stats(),
      phpComplaints.list({ limit: '10' }),
      phpUsers.stats(),
    ]).then(([cStats, cList, uStats]) => {
      setStats(cStats);
      setComplaints(cList.slice(0, 8));
      setUserStats(uStats);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Complaints', value: stats.total, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', path: '/admin/complaints' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', path: '/admin/complaints?status=pending' },
    { label: 'In Progress', value: stats.in_progress, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50', path: '/admin/complaints?status=in_progress' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', path: '/admin/complaints?status=resolved' },
  ];

  const statusColor: Record<string, string> = {
    pending:     'bg-amber-100 text-amber-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    resolved:    'bg-emerald-100 text-emerald-700',
    rejected:    'bg-red-100 text-red-700',
  };

  return (
    <MotionPage className="space-y-6 pb-10">
        <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.name}. Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.02] border-border/50 bg-card/40 backdrop-blur-md transition-all active:scale-[0.98] group" onClick={() => setLocation(s.path)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <p className="text-3xl font-black mt-2 tracking-tight">{loading ? '—' : s.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${s.bg} flex items-center justify-center ring-1 ring-border/10 group-hover:scale-110 transition-transform`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Users summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <Users className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{loading ? '—' : userStats.total}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Staff Members</p>
            <p className="text-2xl font-bold">{loading ? '—' : userStats.staff}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
            <Users className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tenants</p>
            <p className="text-2xl font-bold">{loading ? '—' : userStats.tenants}</p>
          </div>
        </Card>
      </div>

      {/* Recent Complaints */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Complaints</h2>
          <button onClick={() => setLocation('/admin/complaints')} className="text-sm text-primary hover:underline">
            View all
          </button>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
          </div>
        ) : complaints.length > 0 ? (
          <div className="space-y-2">
            {complaints.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">#{c.id} {c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.tenant_name || `Tenant #${c.tenant_id}`} · {c.category_name || 'Uncategorized'}</p>
                </div>
                <div className="ml-4 flex gap-2 shrink-0">
                  <PriorityBadge priority={c.priority} />
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[c.status]}`}>{c.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No complaints yet</p>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Manage Users', desc: 'View and manage tenants and staff', path: '/admin/users', color: 'text-purple-500', bg: 'bg-purple-50' },
          { icon: FileText, label: 'All Complaints', desc: 'View and manage all complaints', path: '/admin/complaints', color: 'text-blue-500', bg: 'bg-blue-50' },
          { icon: AlertCircle, label: 'Analytics', desc: 'View system analytics and reports', path: '/admin/analytics', color: 'text-indigo-500', bg: 'bg-indigo-50' },
        ].map(a => (
          <Card key={a.path} className="p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setLocation(a.path)}>
            <div className={`h-10 w-10 rounded-lg ${a.bg} flex items-center justify-center mb-3`}>
              <a.icon className={`h-5 w-5 ${a.color}`} />
            </div>
            <h3 className="font-semibold">{a.label}</h3>
            <p className="text-sm text-muted-foreground mt-1">{a.desc}</p>
          </Card>
        ))}
      </div>
    </MotionPage>
  );
}
