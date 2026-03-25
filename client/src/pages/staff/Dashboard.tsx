import { useEffect, useState } from "react";
import { usePhpAuth } from "@/contexts/PhpAuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { phpApi } from "@/lib/phpApi";
import { CheckSquare, Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import PriorityBadge from "@/components/PriorityBadge";

export default function StaffDashboard() {
  const { user } = usePhpAuth();
  const [, setLocation] = useLocation();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    phpApi.listStaffAssignments()
      .then(a => setAssignments(a))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:     assignments.length,
    active:    assignments.filter(a => !a.completed_at).length,
    completed: assignments.filter(a => !!a.completed_at).length,
    urgent:    assignments.filter(a => a.complaint_priority === 'urgent' && !a.completed_at).length,
  };

  const statusBg: Record<string, string> = {
    pending:     'bg-amber-100 text-amber-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    resolved:    'bg-emerald-100 text-emerald-700',
    rejected:    'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Staff Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome, {user?.name}. Here are your assigned tasks.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assigned', value: stats.total, icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50', filter: 'all' },
          { label: 'Active Tasks', value: stats.active, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', filter: 'active' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', filter: 'completed' },
          { label: 'Urgent', value: stats.urgent, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', filter: 'urgent' },
        ].map(s => (
          <Card key={s.label} className="p-5 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]" onClick={() => setLocation(`/staff/tasks?filter=${s.filter}`)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{loading ? '—' : s.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Tasks */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Active Tasks</h2>
          <button onClick={() => setLocation('/staff/tasks')} className="text-sm text-primary hover:underline">
            View all
          </button>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg" />)}
          </div>
        ) : assignments.filter(a => !a.completed_at).length > 0 ? (
          <div className="space-y-3">
            {assignments.filter(a => !a.completed_at).slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{a.complaint_title}</p>
                  <p className="text-xs text-muted-foreground">
                    Assigned {new Date(a.assigned_at).toLocaleDateString()}
                    {a.deadline ? ` · Due ${new Date(a.deadline).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 ml-3">
                  <PriorityBadge priority={a.complaint_priority} />
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBg[a.complaint_status] ?? ''}`}>{a.complaint_status?.replace('_',' ')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No active tasks. Great job!</p>
          </div>
        )}
      </Card>
    </div>
  );
}
