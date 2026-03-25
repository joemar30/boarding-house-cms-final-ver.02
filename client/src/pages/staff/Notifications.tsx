import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { phpNotifications, type PhpNotification } from "@/lib/phpApi";
import { Bell, CheckCheck, CheckCircle, Activity, ClipboardList, Star, Info } from "lucide-react";
import { toast } from "sonner";

const typeIcons: Record<string, any> = {
  status_update:    Activity,
  assignment:       ClipboardList,
  feedback_request: Star,
  system:           Info,
};

export default function StaffNotifications() {
  const [notifications, setNotifications] = useState<PhpNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      setNotifications(await phpNotifications.list(50));
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifs(); }, []);

  const handleMarkRead = async (id: number) => {
    await phpNotifications.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const handleMarkAllRead = async () => {
    await phpNotifications.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    toast.success('All notifications marked as read');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map(n => (
            <Card key={n.id} className={`p-4 ${!n.is_read ? 'border-primary/30 bg-primary/5' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  {(() => {
                    const Icon = typeIcons[n.type] ?? Bell;
                    return <Icon className="h-4 w-4" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{n.title}</p>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)}>
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No notifications yet</p>
        </Card>
      )}
    </div>
  );
}
