import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { phpComplaints, phpUsers, phpApi, type PhpComplaint, type PhpUser } from "@/lib/phpApi";
import { Search, UserCheck, Trash2, X, Filter, Calendar, Info } from "lucide-react";
import { toast } from "sonner";
import PriorityBadge from "@/components/PriorityBadge";
import MotionPage from "@/components/MotionPage";
import { motion, AnimatePresence } from "framer-motion";

const statusColors: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700 border-amber-200 shadow-sm shadow-amber-500/10',
  in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-500/10',
  resolved:    'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/10',
  rejected:    'bg-red-100 text-red-700 border-red-200 shadow-sm shadow-red-500/10',
};

export default function AdminComplaints() {
  const [complaints, setComplaints]   = useState<PhpComplaint[]>([]);
  const [staffList, setStaffList]     = useState<PhpUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [updatingId, setUpdatingId]   = useState<number | null>(null);
  const [assignModal, setAssignModal] = useState<PhpComplaint | null>(null);
  const [assignStaffId, setAssignStaffId] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assigning, setAssigning]     = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchTerm)    params.search   = searchTerm;
      if (statusFilter)  params.status   = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const [c, s] = await Promise.all([
        phpComplaints.list(params),
        phpUsers.getStaff(),
      ]);
      setComplaints(c);
      setStaffList(s);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('status')) setStatusFilter(params.get('status') || '');
    if (params.has('priority')) setPriorityFilter(params.get('priority') || '');
  }, []);

  useEffect(() => { fetchData(); }, [searchTerm, statusFilter, priorityFilter]);

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await phpComplaints.updateStatus(id, status);
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: status as any } : c));
      toast.success('Status updated successfully');
    } catch (e: any) {
      toast.error(e.message ?? 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssign = async () => {
    if (!assignModal || !assignStaffId) return;
    setAssigning(true);
    try {
      await phpApi.assignStaff({
        complaint_id: assignModal.id,
        staff_id: parseInt(assignStaffId),
        deadline: assignDeadline || undefined,
      });
      toast.success('Staff assigned successfully');
      setAssignModal(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message ?? 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this complaint permanently?')) return;
    try {
      await phpComplaints.delete(id);
      toast.success('Complaint deleted');
      setComplaints(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      toast.error(e.message ?? 'Delete failed');
    }
  };

  return (
    <MotionPage className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Complaint Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Review, assign and track all boarding house issues</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => { setSearchTerm(""); setStatusFilter(""); setPriorityFilter(""); }} className="h-9 px-3 font-bold">Resest Filters</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search by title, description, or tenant..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-xl bg-background text-foreground transition-all focus:ring-2 focus:ring-primary/20 outline-none h-11"
          />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="flex-1 md:w-36 px-3 py-2 border border-input rounded-xl bg-background text-foreground text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 outline-none h-11"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="flex-1 md:w-36 px-3 py-2 border border-input rounded-xl bg-background text-foreground text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 outline-none h-11"
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center">
              <div className="text-center group">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-muted-foreground font-bold tracking-tight">Syncing complaints database...</p>
              </div>
            </motion.div>
          ) : complaints.length > 0 ? (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Desktop Table */}
              <Card className="hidden lg:block overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-muted/30">
                      <tr>
                        {['#', 'Title / Description', 'Tenant', 'Category', 'Priority', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {complaints.map((c, i) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-accent/30 transition-colors group"
                        >
                          <td className="px-6 py-4 text-sm font-mono text-muted-foreground/60">#{c.id}</td>
                          <td className="px-6 py-4 text-sm max-w-[280px]">
                            <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{c.title}</p>
                            <p className="text-xs text-muted-foreground truncate opacity-70">{c.description}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">{c.tenant_name || `ID: ${c.tenant_id}`}</td>
                          <td className="px-6 py-4 text-sm font-medium">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {c.category_name || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm"><PriorityBadge priority={c.priority} /></td>
                          <td className="px-6 py-4 text-sm">
                            <select
                              value={c.status}
                              onChange={e => handleStatusChange(c.id, e.target.value)}
                              disabled={updatingId === c.id}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${statusColors[c.status]} bg-transparent cursor-pointer disabled:opacity-50 transition-all outline-none focus:ring-2 focus:ring-primary/20`}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon-sm" onClick={() => { setAssignModal(c); setAssignStaffId(''); setAssignDeadline(''); }} className="hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c.id)} className="hover:bg-red-50 text-destructive hover:text-destructive-foreground transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Mobile/Tablet Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                {complaints.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                    <Card className="p-5 flex flex-col h-full border-border/50 hover:border-primary/30 transition-all active:scale-[0.98] group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black font-mono text-muted-foreground opacity-50 mb-1">COMPLAINT #{c.id}</span>
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">{c.title}</h3>
                        </div>
                        <PriorityBadge priority={c.priority} />
                      </div>
                      
                      <div className="flex-1 space-y-3 pb-4">
                        <p className="text-sm text-muted-foreground line-clamp-3 italic opacity-80 decoration-slate-300">"{c.description}"</p>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2">
                           <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tenant</p>
                              <p className="text-xs font-bold truncate">{c.tenant_name}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
                              <p className="text-xs font-bold truncate">{c.category_name || 'Uncategorized'}</p>
                           </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-dashed border-border flex flex-col gap-3">
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                              <Calendar className="h-3 w-3" /> {new Date(c.created_at).toLocaleDateString()}
                            </span>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${statusColors[c.status].split(' ')[1]}`}>
                               {c.status.replace('_', ' ')}
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-2">
                            <select
                              value={c.status}
                              onChange={e => handleStatusChange(c.id, e.target.value)}
                              className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${statusColors[c.status]} bg-transparent cursor-pointer disabled:opacity-50 transition-all h-10 outline-none focus:ring-2 focus:ring-primary/20`}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <Button variant="outline" size="icon" onClick={() => setAssignModal(c)} className="h-10 w-10 text-blue-600 border-blue-100 hover:bg-blue-50">
                               <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-10 w-10 text-destructive hover:bg-red-50">
                               <Trash2 className="h-4 w-4" />
                            </Button>
                         </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="text-center py-24 border-dashed border-2 bg-card/40 backdrop-blur-sm">
                <Search className="h-16 w-16 mx-auto mb-6 opacity-10" />
                <h3 className="text-xl font-bold text-foreground/80 mb-2">Zero complaints found</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">No results match your current filters. Clear them or try a different search term.</p>
                <Button variant="outline" className="font-bold h-11 px-8 rounded-xl" onClick={() => { setSearchTerm(""); setStatusFilter(""); setPriorityFilter(""); }}>
                  Reset Filters
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Assign Staff Modal */}
      <AnimatePresence>
        {assignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm shadow-2xl" onClick={() => setAssignModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md">
              <Card className="p-6 shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black tracking-tight uppercase">Assign Task</h2>
                  <button onClick={() => setAssignModal(null)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
                </div>
                
                <div className="p-3 bg-muted/40 rounded-xl mb-6 border border-border/50">
                   <div className="flex items-start gap-2 mb-1">
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded leading-none mt-0.5">#{assignModal.id}</span>
                      <p className="text-xs font-bold leading-tight">{assignModal.title}</p>
                   </div>
                   <p className="text-[10px] text-muted-foreground ml-10 truncate opacity-70 italic">{assignModal.description}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                       <UserCheck className="h-2.5 w-2.5" /> Staff Member
                    </label>
                    <select value={assignStaffId} onChange={e => setAssignStaffId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 outline-none h-11"
                    >
                      <option value="">Select available staff...</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                    {staffList.length === 0 && <p className="text-[10px] text-destructive font-bold mt-1 px-1 flex items-center gap-1"><Info className="h-2.5 w-2.5" /> No staff users registered in the system.</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                       <Calendar className="h-2.5 w-2.5" /> Final Deadline
                    </label>
                    <input type="datetime-local" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 outline-none h-11"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-8">
                  <Button variant="outline" className="flex-1 font-bold h-11 rounded-xl" onClick={() => setAssignModal(null)}>Cancel</Button>
                  <Button className="flex-1 font-bold h-11 rounded-xl shadow-lg shadow-primary/20" onClick={handleAssign} disabled={assigning || !assignStaffId}>
                    {assigning ? 'Assigning...' : 'Confirm Assignment'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
}
