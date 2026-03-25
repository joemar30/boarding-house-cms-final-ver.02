import { useEffect, useState } from "react";
import { usePhpAuth } from "@/contexts/PhpAuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { phpComplaints, type PhpComplaint } from "@/lib/phpApi";
import { Plus, AlertCircle, CheckCircle2, Clock, FileText, X, ChevronRight, Activity, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import PriorityBadge from "@/components/PriorityBadge";
import MotionPage from "@/components/MotionPage";
import { motion, AnimatePresence } from "framer-motion";

const statusColors: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  resolved:    'bg-emerald-100 text-emerald-700 border-emerald-200 font-bold',
  rejected:    'bg-red-100 text-red-700 border-red-200 font-bold',
};

export default function TenantDashboard() {
  const { user } = usePhpAuth();
  const [, setLocation] = useLocation();
  const [complaints, setComplaints] = useState<PhpComplaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    phpComplaints.list()
      .then(c => setComplaints(c))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:      complaints.length,
    pending:    complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved:   complaints.filter(c => c.status === 'resolved').length,
    rejected:   complaints.filter(c => c.status === 'rejected').length,
  };

  return (
    <MotionPage className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Bonjour, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium opacity-80">Track and manage your residency concerns effortlessly.</p>
        </div>
        <div className="flex gap-2">
           <Button
             onClick={() => setLocation("/tenant/complaints?new=1")}
             className="gap-2 font-bold h-12 px-8 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all group overflow-hidden relative"
           >
             <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
             <Plus className="h-5 w-5 relative z-10" />
             <span className="relative z-10">New Complaint</span>
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Reports', value: stats.total, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20', filter: '' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20', filter: 'pending' },
          { label: 'Ongoing', value: stats.inProgress, icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-500/10', ring: 'ring-indigo-500/20', filter: 'in_progress' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20', filter: 'resolved' },
          { label: 'Rejected', value: stats.rejected, icon: X, color: 'text-red-500', bg: 'bg-red-500/10', ring: 'ring-red-500/20', filter: 'rejected' },
        ].map((s, idx) => (
          <motion.button
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setLocation(`/tenant/complaints${s.filter ? `?status=${s.filter}` : ''}`)}
            className="group block transition-all text-left outline-none"
          >
            <Card className={`p-5 h-full rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md hover:shadow-2xl hover:scale-[1.03] transition-all active:scale-[0.97] group-hover:border-primary/30 flex flex-col justify-between overflow-hidden relative`}>
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors pointer-events-none" />
              <div className={`h-12 w-12 rounded-xl ${s.bg} flex items-center justify-center mb-4 ring-1 ${s.ring} relative z-10`}>
                <s.icon className={`h-6 w-6 ${s.color} group-hover:scale-110 transition-transform`} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{s.label}</p>
                <p className="text-3xl font-black mt-2 tracking-tight">{loading ? '—' : s.value}</p>
              </div>
            </Card>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-8 lg:col-span-2 border-border/50 bg-card/40 backdrop-blur-md shadow-xl rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none rotate-12">
             <Zap className="h-48 w-48 text-primary" />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Recent Activity</h2>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Status updates from management</p>
            </div>
            <Link href="/tenant/complaints" className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-primary hover:gap-2 transition-all group-hover:underline px-4 py-2 bg-primary/10 rounded-xl cursor-pointer">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : complaints.length > 0 ? (
            <div className="space-y-4 relative z-10">
              {complaints.slice(0, 4).map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-4 border border-border/40 rounded-2xl hover:bg-white/80 hover:shadow-lg hover:border-primary/20 transition-all group cursor-pointer"
                  onClick={() => setLocation(`/tenant/complaints?id=${c.id}`)}
                >
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                       <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate text-foreground leading-tight">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium font-mono">
                        {c.category_name || 'General'} · {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-2 shrink-0">
                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${statusColors[c.status]}`}>
                      {c.status.replace('_', ' ')}
                    </div>
                    <PriorityBadge priority={c.priority} />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-3xl bg-muted/5">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-10" />
              <p className="font-bold text-lg">No history detected</p>
              <p className="text-sm opacity-60 max-w-[200px] mx-auto mt-2 italic leading-relaxed">
                Start by lodging your first concern to see activity here.
              </p>
              <Button
                 variant="outline"
                 className="mt-6 font-bold h-11 px-8 rounded-xl shadow-lg active:scale-95 transition-all"
                 onClick={() => setLocation("/tenant/complaints?new=1")}
              >
                Start Reporting
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-8 border-border/50 bg-card/40 backdrop-blur-md shadow-xl rounded-3xl flex flex-col items-center justify-center text-center group">
           <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              <Sparkles className="h-10 w-10 text-primary" />
           </div>
           <h3 className="text-xl font-black uppercase tracking-tight mb-2">Need Guidance?</h3>
           <p className="text-sm text-muted-foreground font-medium mb-8 leading-relaxed italic opacity-80">
              Ask our AI Assistant for tips on filing reports or resolving common issues.
           </p>
           <Button
             className="w-full font-bold h-12 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
             onClick={() => {
                // This could interact with the FloatingAIChat if we had a ref or global state
                // For now, let's just show a toast or navigation hint
                document.querySelector('button[size="lg"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
             }}
           >
              Chat With AI
           </Button>
        </Card>
      </div>
    </MotionPage>
  );
}

import { Sparkles } from "lucide-react";
