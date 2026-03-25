import { Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

type Status = "pending" | "in_progress" | "resolved" | "rejected";

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md" | "lg";
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "status-pending",
    bgClass: "bg-[hsl(var(--status-pending)_/_0.1)]",
    textClass: "text-[hsl(var(--status-pending))]",
  },
  in_progress: {
    label: "In Progress",
    icon: AlertCircle,
    className: "status-in-progress",
    bgClass: "bg-[hsl(var(--status-in-progress)_/_0.1)]",
    textClass: "text-[hsl(var(--status-in-progress))]",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    className: "status-resolved",
    bgClass: "bg-[hsl(var(--status-resolved)_/_0.1)]",
    textClass: "text-[hsl(var(--status-resolved))]",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "status-rejected",
    bgClass: "bg-[hsl(var(--status-rejected)_/_0.1)]",
    textClass: "text-[hsl(var(--status-rejected))]",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1.5",
    md: "px-3 py-1.5 text-sm gap-2",
    lg: "px-4 py-2 text-base gap-2.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium transition-all ${sizeClasses[size]} ${config.bgClass} ${config.textClass}`}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </div>
  );
}
