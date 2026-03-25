import { useState, useEffect } from "react";
import { usePhpAuth } from "@/contexts/PhpAuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { phpComplaints, phpApi, type PhpComplaint, type PhpCategory } from "@/lib/phpApi";
import { Plus, X, AlertCircle, CheckCircle2, Clock, FileText, Filter, Star, ChevronRight, Activity } from "lucide-react";

import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import PriorityBadge from "@/components/PriorityBadge";
import MotionPage from "@/components/MotionPage";
import { motion, AnimatePresence } from "framer-motion";

const statusColors: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700 border-amber-200 shadow-sm shadow-amber-500/10',
  in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-500/10',
  resolved:    'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/10 font-bold',
  rejected:    'bg-red-100 text-red-700 border-red-200 shadow-sm shadow-red-500/10 font-bold',
};

export default function TenantComplaints() {
  const { user } = usePhpAuth();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [complaints, setComplaints]   = useState<PhpComplaint[]>([]);
  const [categories, setCategories]   = useState<PhpCategory[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [form, setForm] = useState({ category_id: '', title: '', description: '', priority: 'medium' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [ratingTarget, setRatingTarget]       = useState<PhpComplaint | null>(null);
  const [ratingValue, setRatingValue]         = useState(0);
  const [ratingComment, setRatingComment]     = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, cats] = await Promise.all([phpComplaints.list(), phpApi.categories()]);
      setComplaints(c);
      setCategories(cats);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  // Sync state with URL params
  useEffect(() => {
    fetchData();
    const params = new URLSearchParams(search);
    if (params.get('new') === '1') {
      setShowForm(true);
    }
    const initialFilters = { 
      status: params.get('status') || '', 
      priority: params.get('priority') || '' 
    };
    setFilters(initialFilters);
  }, [location, search]); // Now correctly listens to search changes

  const updateFilters = (newFilters: { status: string; priority: string }) => {
    setFilters(newFilters);
    const params = new URLSearchParams(window.location.search);
    if (newFilters.status) params.set('status', newFilters.status);
    else params.delete('status');
    
    if (newFilters.priority) params.set('priority', newFilters.priority);
    else params.delete('priority');
    
    const newSearch = params.toString();
    setLocation(`${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`);
  };

  const clearFilters = () => updateFilters({ status: '', priority: '' });

  const toggleStatusFilter = (statusKey: string) => {
    const newStatus = filters.status === statusKey ? '' : statusKey;
    updateFilters({ ...filters, status: newStatus });
  };

  const filteredComplaints = complaints.filter(c => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.priority && c.priority !== filters.priority) return false;
    return true;
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    const titleVal = (form.title || '').trim();
    const descVal = (form.description || '').trim();

    if (!form.category_id) errs.category_id = 'Please select a category';
    if (titleVal.length < 5) errs.title = 'Title must be at least 5 characters';
    if (descVal.length < 10) errs.description = 'Description must be at least 10 characters';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        category_id: parseInt(form.category_id),
        title:       form.title.trim(),
        description: form.description.trim(),
        priority:    form.priority,
      };
      
      await phpComplaints.create(payload);
      toast.success('Complaint submitted successfully!');
      setForm({ category_id: '', title: '', description: '', priority: 'medium' });
      setErrors({});
      setShowForm(false);
      // Clean up URL if it has ?new=1
      if (window.location.search.includes('new=1')) {
        setLocation('/tenant/complaints');
      }
      fetchData();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingTarget || !ratingValue) return;
    setSubmittingRating(true);
    try {
      await phpApi.submitFeedback(ratingTarget.id, ratingValue, ratingComment);
      toast.success('Thank you for your feedback!');
      setRatingTarget(null);
      setRatingValue(0);
      setRatingComment('');
      fetchData();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to submit feedback');
    } finally {
      setSubmittingRating(false);
    }
  };

  const stats = {
    total:      complaints.length,
    pending:    complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved:   complaints.filter(c => c.status === 'resolved').length,
  };

  const statCards = [
    { label: 'Total', value: stats.total, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', ring: 'ring-blue-400', statusKey: '' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', ring: 'ring-amber-400', statusKey: 'pending' },
    { label: 'In Progress', value: stats.inProgress, icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50', ring: 'ring-indigo-400', statusKey: 'in_progress' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-400', statusKey: 'resolved' },
  ];

  return (
    <MotionPage className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Complaints</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Lodge an issue or track existing reports</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(prev => !prev);
            setErrors({});
            // If we are cancelling from a ?new=1 state, clean the URL
            if (showForm && window.location.search.includes('new=1')) {
              setLocation('/tenant/complaints');
            }
          }}
          className="gap-2 font-bold h-11 px-6 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel Submission' : 'Report New Issue'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(s => {
          const isActive = s.statusKey === '' ? filters.status === '' : filters.status === s.statusKey;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => toggleStatusFilter(s.statusKey)}
              className="text-left transition-all duration-300 relative group outline-none cursor-pointer"
            >
              <Card className={`p-4 flex items-center gap-3 h-full transition-all border-border/50 bg-card/40 backdrop-blur-sm ${isActive ? `ring-2 ${s.ring} bg-white shadow-xl` : 'hover:shadow-md hover:border-primary/20'}`}>
                <div className={`h-11 w-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <p className="text-xl font-bold">{loading ? '—' : s.value}</p>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="z-20 relative"
          >
            <Card className="p-6 border-primary/20 bg-primary/5 shadow-2xl backdrop-blur-md overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <FileText className="h-24 w-24" />
              </div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Submit a New Complaint
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Category *</label>
                    <select
                      value={form.category_id}
                      onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground h-11 transition-all focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="">Select a category...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {errors.category_id && <p className="text-destructive text-[10px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.category_id}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Priority Level</label>
                    <div className="flex gap-2 p-1 bg-muted/40 rounded-xl border border-input h-11 items-center">
                      {['low', 'medium', 'high', 'urgent'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, priority: p }))}
                          className={`flex-1 h-full rounded-lg text-[10px] font-black transition-all uppercase tracking-widest px-2 ${
                            form.priority === p
                              ? 'bg-white text-primary shadow-sm border border-primary/10'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Leaking kitchen sink"
                    className="w-full px-4 py-2.5 border border-input rounded-xl bg-background text-foreground h-11 transition-all focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  {errors.title && <p className="text-destructive text-[10px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.title}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Detailed Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Please provide as much detail as possible to help us resolve this quickly..."
                    rows={4}
                    className="w-full px-4 py-3 border border-input rounded-xl bg-background text-foreground resize-none transition-all focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  {errors.description && <p className="text-destructive text-[10px] font-bold mt-1 ml-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.description}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={submitting} className="flex-1 font-bold h-11 rounded-xl shadow-lg shadow-primary/10">
                    {submitting ? 'Submitting...' : 'Confirm Submission'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 font-bold h-11 rounded-xl"
                    onClick={() => {
                      setShowForm(false);
                      setErrors({});
                      if (window.location.search.includes('new=1')) setLocation('/tenant/complaints');
                    }}
                  >
                    Discard
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-4 bg-muted/20 border-border/50 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">Filter Data</span>
          </div>
          <div className="flex gap-2">
            <select
              value={filters.status}
              onChange={e => updateFilters({ ...filters, status: e.target.value })}
              className="text-xs font-bold border border-input rounded-lg px-3 py-1.5 bg-background h-9 transition-all outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filters.priority}
              onChange={e => updateFilters({ ...filters, priority: e.target.value })}
              className="text-xs font-bold border border-input rounded-lg px-3 py-1.5 bg-background h-9 transition-all outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          {(filters.status || filters.priority) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-3 text-[10px] font-black uppercase tracking-widest hover:text-destructive"
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 bg-muted/5 rounded-2xl border border-dashed border-border">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4 opacity-50" />
             <p className="text-muted-foreground font-bold tracking-tight">Syncing your complaint history...</p>
          </div>
        ) : filteredComplaints.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredComplaints.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-5 h-full hover:shadow-xl transition-all border-border/50 bg-card/40 backdrop-blur-sm group hover:border-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none group-hover:scale-150 transition-transform duration-700">
                    <FileText className="h-20 w-20" />
                  </div>
                  <div className="flex flex-col h-full relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold font-mono text-muted-foreground px-1.5 py-0.5 bg-muted rounded leading-none">#{c.id}</span>
                          {c.category_name && (
                            <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded tracking-widest">{c.category_name}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">{c.title}</h3>
                      </div>
                      <div className="flex flex-col gap-2 items-end shrink-0">
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${statusColors[c.status]}`}>
                          {c.status.replace('_', ' ')}
                        </div>
                        <PriorityBadge priority={c.priority} />
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 italic leading-relaxed opacity-80 flex-1">
                      "{c.description}"
                    </p>
                    
                    <div className="mt-6 pt-4 border-t border-dashed border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px] font-bold">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {(c.status === 'resolved' || c.status === 'rejected') && (
                        <button
                          type="button"
                          onClick={() => {
                            setRatingTarget(c);
                            setRatingValue(0);
                            setRatingComment('');
                          }}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white hover:bg-primary border border-primary/20 rounded-lg px-4 py-2 transition-all active:scale-95 shadow-sm"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Rate Service
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-20 text-center border-dashed border-2 bg-muted/10 backdrop-blur-sm">
            <div className="relative inline-block mb-6">
               <FileText className="h-16 w-16 text-muted-foreground opacity-10 mx-auto" />
               <X className="h-6 w-6 text-destructive absolute -top-1 -right-1 opacity-20" />
            </div>
            <h3 className="text-xl font-bold mb-2">No complaints found</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-8">
              {complaints.length > 0 
                ? "Your current filters aren't matching any results. Try broadening your criteria." 
                : "You haven't reported any issues yet. If something needs attention, we're here to help."}
            </p>
            <Button
              variant="outline"
              size="lg"
              className="font-bold h-11 px-8 rounded-xl shadow-lg"
              onClick={complaints.length > 0 ? clearFilters : () => setShowForm(true)}
            >
              {complaints.length > 0 ? "Reset Application Filters" : "Lodge First Complaint"}
            </Button>
          </Card>
        )}
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {ratingTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md shadow-2xl" onClick={() => setRatingTarget(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md">
              <Card className="p-6 shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] -rotate-12 pointer-events-none">
                   <Star className="h-64 w-64 fill-primary" />
                </div>
                <div className="flex justify-between items-center mb-6 relative">
                  <h3 className="text-xl font-black uppercase tracking-tight">Rate Service</h3>
                  <button
                    type="button"
                    onClick={() => setRatingTarget(null)}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="mb-8 p-4 bg-muted/40 rounded-xl border border-border/50 relative">
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Issue Reference</p>
                   <p className="text-sm font-bold truncate leading-tight">"{ratingTarget.title}"</p>
                </div>

                <form onSubmit={handleRatingSubmit} className="space-y-8 relative">
                  <div className="space-y-3 text-center">
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Select satisfaction level</p>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setRatingValue(v)}
                          className="p-1 transition-all hover:scale-125 focus:outline-none"
                        >
                          <Star
                            className={`h-11 w-11 ${
                              v <= ratingValue
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : 'text-muted-foreground/30 hover:text-amber-200'
                            } transition-all duration-300`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Additional Comments</label>
                    <textarea
                      value={ratingComment}
                      onChange={e => setRatingComment(e.target.value)}
                      placeholder="Help us improve by sharing your experience..."
                      className="w-full px-4 py-3 border border-input rounded-xl bg-background text-foreground resize-none text-sm transition-all focus:ring-2 focus:ring-primary/20 outline-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      className="flex-1 font-bold h-12 rounded-xl shadow-xl shadow-primary/20"
                      disabled={!ratingValue || submittingRating}
                    >
                      {submittingRating ? 'Processing...' : 'Submit Feedback'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 font-bold h-12 rounded-xl"
                      onClick={() => setRatingTarget(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
}
