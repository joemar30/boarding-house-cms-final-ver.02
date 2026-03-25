import { AlertCircle, ChevronUp, ChevronDown, Minus } from "lucide-react";

type Priority = 'low' | 'medium' | 'high' | 'urgent';

const config = {
  low: {
    icon: ChevronDown,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'Low'
  },
  medium: {
    icon: Minus,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Medium'
  },
  high: {
    icon: ChevronUp,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    label: 'High'
  },
  urgent: {
    icon: AlertCircle,
    color: 'bg-red-100 text-red-700 border-red-200',
    label: 'Urgent'
  }
};

export default function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase() as Priority;
  const cfg = config[p] ?? config.medium;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${cfg.color} tracking-tight uppercase`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}
