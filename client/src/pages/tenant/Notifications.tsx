import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { phpNotifications, type PhpNotification } from "@/lib/phpApi";
import { Bell, CheckCheck, CheckCircle, Activity, ClipboardList, Star, Info, Inbox } from "lucide-react";
import { toast } from "sonner";
import MotionPage from "@/components/MotionPage";
import { motion, AnimatePresence } from "framer-motion";

const typeIcons: Record<string, any> = {
  status_update:    Activity,
  assignment:       ClipboardList,
  feedback_request: Star,
  system:           Info,
};

export default function TenantNotifications() {
  const [notifications, setNotifications] = useState<PhpNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await phpNotifications.list(50);
      setNotifications(data);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifs(); }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await phpNotifications.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await phpNotifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      toast.success('All notifications marked as read');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <MotionPage className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Status Feed</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium opacity-80">
            {unreadCount > 0 
              ? `You have ${unreadCount} new alert${unreadCount > 1 ? 's' : ''}` 
              : 'All notifications cleared!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={handleMarkAllRead} 
            className="gap-2 font-bold h-11 px-6 rounded-xl shadow-lg border-primary/20 active:scale-95 transition-all"
          >
            <CheckCheck className="h-4 w-4" /> Mark All Read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 bg-muted/5 rounded-3xl border border-dashed border-border/50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground font-bold tracking-tight">Syncing your alerts...</p>
        </div>
      ) : notifications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {notifications.map((n, idx) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className={`p-5 h-full transition-all border-border/50 relative overflow-hidden group ${!n.is_read ? 'bg-primary/5 ring-1 ring-primary/20 shadow-md ring-inset' : 'bg-card/40 backdrop-blur-sm opacity-80'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 shadow-sm group-hover:scale-110 transition-transform ${!n.is_read ? 'bg-primary text-primary-foreground shadow-primary/20' : 'bg-muted/40 text-muted-foreground'}`}>
                      {(() => {
                        const Icon = typeIcons[n.type] ?? Bell;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 min-w-0">
                        <p className={`font-bold text-sm truncate leading-tight ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${!n.is_read ? 'text-muted-foreground font-medium' : 'text-muted-foreground/60'}`}>{n.message}</p>
                      
                      <div className="mt-4 flex items-center justify-between">
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                            {new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                         </p>
                         
                         {!n.is_read && (
                            <button
                              type="button"
                              onClick={() => handleMarkRead(n.id)}
                              className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors flex items-center gap-1.5 focus:outline-none"
                            >
                              <CheckCircle className="h-3 w-3" /> Dismiss
                            </button>
                         )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card className="py-20 text-center border-dashed border-2 bg-muted/5 backdrop-blur-sm rounded-3xl">
          <div className="relative inline-block mb-6">
             <Inbox className="h-16 w-16 text-muted-foreground opacity-10 mx-auto" />
             <CheckCircle className="h-6 w-6 text-emerald-500 absolute -top-1 -right-1 opacity-20" />
          </div>
          <h3 className="text-xl font-bold mb-2">Zero Notifications</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto italic">
            You are fully updated. We'll alert you here if there's any update to your reports.
          </p>
        </Card>
      )}
    </MotionPage>
  );
}
