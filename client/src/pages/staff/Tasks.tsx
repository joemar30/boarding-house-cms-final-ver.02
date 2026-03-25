import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { phpApi } from "@/lib/phpApi";
import { CheckCircle2, Clock, AlertCircle, ListTodo, Star } from "lucide-react";

import { toast } from "sonner";
import PriorityBadge from "@/components/PriorityBadge";

export default function StaffTasks() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [completing, setCompleting]   = useState<number | null>(null);
  const [filter, setFilter]           = useState<'all' | 'active' | 'completed'>('all');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await phpApi.listStaffAssignments();
      setAssignments(data);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchTasks(); 
    const params = new URLSearchParams(window.location.search);
    const f = params.get('filter') as any;
    if (f === 'active' || f === 'completed' || f === 'all') {
      setFilter(f);
    }
  }, []);

  const handleComplete = async (assignmentId: number) => {
    setCompleting(assignmentId);
    try {
      await phpApi.completeAssignment(assignmentId);
      toast.success('Task marked as complete!');
      fetchTasks();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to complete task');
    } finally {
      setCompleting(null);
    }
  };

  const filtered = assignments.filter(a => {
    if (filter === 'active')    return !a.completed_at;
    if (filter === 'completed') return !!a.completed_at;
    return true;
  });

  const statusBg: Record<string, string> = {
    pending:     'bg-amber-100 text-amber-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    resolved:    'bg-emerald-100 text-emerald-700',
    rejected:    'bg-red-100 text-red-700',
  };
  const priorityBg: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high:   'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
        <p className="text-muted-foreground mt-1">View and manage your assigned complaints</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >{f} {f !== 'all' && `(${assignments.filter(a => f === 'active' ? !a.completed_at : !!a.completed_at).length})`}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map(a => (
            <Card key={a.id} className={`p-5 ${!a.completed_at && a.complaint_priority === 'urgent' ? 'border-red-200 bg-red-50/30' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${a.completed_at ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                  {a.completed_at
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    : <Clock className="h-5 w-5 text-indigo-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold">{a.complaint_title}</h3>
                    <PriorityBadge priority={a.complaint_priority} />
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBg[a.complaint_status] ?? ''}`}>
                      {a.complaint_status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Tenant: {a.tenant_name}</p>
                  {a.notes && <p className="text-sm mt-1 text-foreground/80">Notes: {a.notes}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Assigned: {new Date(a.assigned_at).toLocaleDateString()}</span>
                    {a.deadline && <span>Due: {new Date(a.deadline).toLocaleDateString()}</span>}
                    {a.completed_at && (
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-emerald-600 font-medium">✓ Completed: {new Date(a.completed_at).toLocaleDateString()}</span>
                        {a.rating > 0 && (
                          <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 mt-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-3 w-3 ${i < a.rating ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />
                                ))}
                              </div>
                              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Tenant Rating</span>
                            </div>
                            {a.tenant_comment && (
                              <p className="text-xs text-amber-800/80 italic line-clamp-2">"{a.tenant_comment}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {!a.completed_at && (
                  <Button
                    size="sm"
                    onClick={() => handleComplete(a.id)}
                    disabled={completing === a.id}
                    className="shrink-0"
                  >
                    {completing === a.id ? 'Completing...' : 'Mark Complete'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No tasks found</p>
        </Card>
      )}
    </div>
  );
}
