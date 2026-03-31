import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "../../../lib/cn";

export interface KPIStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    label: string;
  };
  trend?: "up" | "down" | "neutral";
  icon: React.ElementType;
  iconColor: string;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
}

export function KPIStatCard({
  title,
  value,
  subtitle,
  change,
  trend,
  icon: Icon,
  iconColor,
  href,
  onClick,
  loading = false,
}: KPIStatCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  const isClickable = !!href || !!onClick;

  const content = (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {isClickable && (
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            {loading ? (
              <div className="mt-2 h-8 w-32 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
            {change && !loading && (
              <div
                className={cn(
                  "mt-2 flex items-center gap-1 text-xs font-medium",
                  trend === "up" && "text-emerald-500",
                  trend === "down" && "text-red-500",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trend === "up" && <TrendingUp className="h-3 w-3" />}
                {trend === "down" && <TrendingDown className="h-3 w-3" />}
                <span>
                  {trend === "up" ? "+" : trend === "down" ? "" : ""}{change.value}%
                </span>
                <span className="text-muted-foreground font-normal">{change.label}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300",
              isClickable && "group-hover:scale-110",
              iconColor
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {isClickable && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
    </>
  );

  if (isClickable) {
    return (
      <button
        onClick={handleClick}
        className="group relative w-full text-left overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5">
      {content}
    </div>
  );
}
