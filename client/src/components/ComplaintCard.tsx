import { StatusBadge } from "./StatusBadge";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ArrowRight, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";

interface ComplaintCardProps {
  id: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "resolved" | "rejected";
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: Date;
  onView?: () => void;
}

const priorityColors = {
  low: "text-blue-600 bg-blue-50",
  medium: "text-amber-600 bg-amber-50",
  high: "text-orange-600 bg-orange-50",
  urgent: "text-red-600 bg-red-50",
};

export function ComplaintCard({
  id,
  title,
  description,
  status,
  category,
  priority,
  createdAt,
  onView,
}: ComplaintCardProps) {
  return (
    <Card className="p-4 md:p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base md:text-lg truncate text-foreground">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs md:text-sm">
          <Tag className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{category}</span>
        </div>
        <div className={`px-2 py-1 rounded-md text-xs font-medium ${priorityColors[priority]}`}>
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </div>
        <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground ml-auto">
          <Calendar className="h-3 w-3 md:h-4 md:w-4" />
          <span>{format(new Date(createdAt), "MMM d, yyyy")}</span>
        </div>
      </div>

      {onView && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onView}
          className="w-full justify-between text-primary hover:text-primary"
        >
          <span>View Details</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
}
