import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { phpApi } from "@/lib/phpApi";
import { BarChart3, TrendingUp, Users, Star, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format } from "date-fns";


import MotionPage from "@/components/MotionPage";
import { motion } from "framer-motion";

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    phpApi.analytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <MotionPage className="space-y-6">
      <div><h1 className="text-3xl font-bold">Analytics</h1></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
      </div>
    </MotionPage>
  );

  const complaints = data?.complaints ?? {};
  const byCategory = data?.by_category ?? [];
  const monthly    = data?.monthly ?? [];
  const users      = data?.users ?? [];
  const avgRating  = data?.avg_rating ?? {};
  const activity   = data?.recent_activity ?? [];
  const feedback   = data?.recent_feedback ?? [];

  const statusItems = [
    { label: 'Total',       value: complaints.total ?? 0,       color: 'bg-blue-500' },
    { label: 'Pending',     value: complaints.pending ?? 0,     color: 'bg-amber-500' },
    { label: 'In Progress', value: complaints.in_progress ?? 0, color: 'bg-indigo-500' },
    { label: 'Resolved',    value: complaints.resolved ?? 0,    color: 'bg-emerald-500' },
    { label: 'Rejected',    value: complaints.rejected ?? 0,    color: 'bg-red-500' },
  ];

  const maxCategoryCount = Math.max(...byCategory.map((c: any) => parseInt(c.count || 0)), 1);

  return (
    <MotionPage className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">System performance overview and statistics</p>
      </div>

      {/* Complaint Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statusItems.map(s => (
          <Card key={s.label} className="p-5 text-center">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
            <div className={`h-1 rounded mt-3 ${s.color} opacity-60`} />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Chart */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Complaints by Category</h2>
          </div>
          {byCategory.length > 0 ? (
            <div className="space-y-3">
              {byCategory.map((cat: any) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">{cat.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(parseInt(cat.count) / maxCategoryCount) * 100}%`, background: cat.color || '#6366f1' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No data yet</p>
          )}
        </Card>

        {/* Monthly Trend */}
        <Card className="p-6 relative overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 transition-all hover:border-primary/30 shadow-sm hover:shadow-md">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20 shadow-inner">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg tracking-tight">Monthly complaints</h2>
                <p className="text-xs text-muted-foreground font-medium">Activity over the last 6 months</p>
              </div>
            </div>
            {monthly.length > 0 && (
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-primary leading-none">
                  {monthly.reduce((sum: number, m: any) => sum + (parseInt(m.count) || 0), 0)}
                </span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Total Period</span>
              </div>
            )}
          </div>
          
          <div className="h-[220px] w-full relative">
            {monthly.length > 0 ? (
              <ChartContainer
                config={{
                  count: {
                    label: "Complaints",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-full w-full"
              >
                <BarChart
                  data={monthly.map((m: any) => ({
                    month: m.month ? format(new Date(m.month + "-01"), "MMM") : '???',
                    count: parseInt(m.count) || 0,
                  }))}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 500 }}
                  />
                  <ChartTooltip 
                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                    content={<ChartTooltipContent hideLabel indicator="dot" className="text-primary" />} 
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[6, 6, 2, 2]}
                    barSize={Math.min(40, 200 / Math.max(monthly.length, 1))}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60 bg-muted/30 rounded-2xl border-2 border-dashed border-muted/50">
                <BarChart3 className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm font-medium">No analytical data found</p>
              </div>
            )}
          </div>
        </Card>

        {/* User Stats */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Users by Role</h2>
          </div>
          {users.length > 0 ? (
            <div className="space-y-3">
              {users.map((u: any) => {
                const color: Record<string, string> = { admin: '#8b5cf6', staff: '#3b82f6', tenant: '#10b981' };
                const total = users.reduce((s: number, x: any) => s + parseInt(x.count), 0);
                return (
                  <div key={u.role}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{u.role}</span>
                      <span className="text-muted-foreground">{u.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${(parseInt(u.count)/total) * 100}%`, background: color[u.role] ?? '#6366f1' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No user data</p>
          )}
        </Card>

        {/* Rating & Activity */}
        <Card className="p-6 relative overflow-hidden bg-background/50 backdrop-blur-sm border-primary/10 transition-all hover:border-primary/30 shadow-sm hover:shadow-md">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500 ring-1 ring-amber-200/50 shadow-inner">
                <Star className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h2 className="font-bold text-lg tracking-tight">Recent Ratings</h2>
                <p className="text-xs text-muted-foreground font-medium">Tenant satisfaction overview</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-amber-50 rounded-full border border-amber-100 flex items-center gap-2">
              <span className="text-sm font-bold text-amber-600">{avgRating?.avg_rating ? parseFloat(avgRating.avg_rating).toFixed(1) : '0.0'}</span>
              <div className="flex bg-amber-200/50 rounded p-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-2.5 w-2.5 ${i < Math.round(avgRating?.avg_rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-amber-300'}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 relative">
            {feedback.length > 0 ? (
              <div className="grid gap-3">
                {feedback.slice(0, 5).map((f: any) => (
                  <div key={f.id} className="p-3 bg-muted/30 rounded-xl border border-border/50 transition-colors hover:bg-muted/50 group">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                           {f.tenant_name?.charAt(0).toUpperCase()}
                         </div>
                         <span className="text-xs font-bold text-foreground">{f.tenant_name}</span>
                       </div>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-2.5 w-2.5 ${i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-muted/30'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded leading-none">#{f.complaint_id}</span>
                    </div>

                    <p className="text-xs font-semibold text-foreground/80 line-clamp-1 mb-1 px-0.5">{f.complaint_title}</p>
                    {f.comment && (
                      <p className="text-[11px] text-muted-foreground italic leading-relaxed line-clamp-2 px-0.5">"{f.comment}"</p>
                    )}

                    {f.staff_name && (
                      <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1 text-[10px]">
                        <Activity className="h-2.5 w-2.5 text-primary/50" />
                        <span className="text-muted-foreground">Handled by:</span>
                        <span className="text-primary font-bold">{f.staff_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center opacity-50 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                <Star className="h-10 w-10 mb-2 text-muted/30" />
                <p className="text-xs font-medium">No ratings received yet</p>
              </div>
            )}
            
            {activity.length > 0 && (
              <div className="pt-4 mt-2 border-t border-border/50">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                   <Activity className="h-3 w-3" /> System activity
                </h3>
                <div className="space-y-2">
                  {activity.slice(0, 3).map((log: any) => (
                    <div key={log.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="h-1 w-1 rounded-full bg-primary/40" />
                      <span className="font-semibold text-foreground/80">{log.user_name || 'System'}</span>
                      <span className="opacity-70">{log.action.replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="ml-auto opacity-50">{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </MotionPage>
  );
}
