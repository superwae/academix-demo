import { X } from "lucide-react";
import { cn } from "../../../lib/cn";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";

export interface DetailSection {
  title?: string;
  items: {
    label: string;
    value: React.ReactNode;
    className?: string;
  }[];
}

export interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ElementType;
  badge?: {
    label: string;
    variant: "success" | "warning" | "error" | "info" | "default";
  };
  headerContent?: React.ReactNode;
  sections: DetailSection[];
  actions?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const badgeVariants = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  error: "bg-red-500/10 text-red-600 border-red-500/20",
  info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  default: "bg-muted text-muted-foreground border-border",
};

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function DetailModal({
  open,
  onClose,
  title,
  icon: Icon,
  badge,
  headerContent,
  sections,
  actions,
  size = "md",
}: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(sizeClasses[size], "p-0 gap-0 overflow-hidden")}>
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <div>
                <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                {badge && (
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      badgeVariants[badge.variant]
                    )}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          {headerContent && <div className="mt-4">{headerContent}</div>}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.title && (
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                  {section.title}
                </h4>
              )}
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className={cn(
                      "flex items-start justify-between gap-4 text-sm",
                      item.className
                    )}
                  >
                    <span className="text-muted-foreground shrink-0">{item.label}</span>
                    <span className="font-medium text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {actions && (
          <div className="flex items-center gap-2 p-6 pt-4 border-t border-border/50 bg-muted/30">
            {actions}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Utility components for common detail patterns
export function DetailAmount({
  label,
  amount,
  variant = "default",
}: {
  label: string;
  amount: string;
  variant?: "default" | "success" | "error";
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-lg font-bold",
          variant === "success" && "text-emerald-500",
          variant === "error" && "text-red-500"
        )}
      >
        {amount}
      </span>
    </div>
  );
}

export function DetailCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-4 rounded-lg border border-border bg-card", className)}>
      {children}
    </div>
  );
}

export function DetailTimeline({
  items,
}: {
  items: {
    label: string;
    value: string;
    active?: boolean;
    completed?: boolean;
  }[];
}) {
  return (
    <div className="relative">
      <div className="absolute left-2 top-3 bottom-3 w-0.5 bg-border" />
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="relative flex items-start gap-4 pl-6">
            <div
              className={cn(
                "absolute left-0 top-1 h-4 w-4 rounded-full border-2",
                item.completed
                  ? "border-emerald-500 bg-emerald-500"
                  : item.active
                  ? "border-primary bg-primary animate-pulse"
                  : "border-border bg-background"
              )}
            />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
