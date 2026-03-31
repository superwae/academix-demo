import { useState } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  X,
  Calendar,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../../ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";

export interface FilterOption {
  id: string;
  label: string;
  icon?: React.ElementType;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export interface DateRangeFilter {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterConfig[];
  dateRange?: DateRangeFilter;
  onClearAll: () => void;
  showAdvancedFilters?: boolean;
  advancedFilters?: React.ReactNode;
}

export function FilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters,
  dateRange,
  onClearAll,
  showAdvancedFilters = false,
  advancedFilters,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters = filters.some((f) => f.value !== "all") || 
    (dateRange && (dateRange.from || dateRange.to));

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-border/50 focus:border-primary/30 focus:bg-background"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        {filters.map((filter) => (
          <DropdownMenu key={filter.key}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "gap-2 h-10",
                  filter.value !== "all" && "border-primary/50 bg-primary/5"
                )}
              >
                {filter.label}: {filter.options.find((o) => o.id === filter.value)?.label || "All"}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs">{filter.label}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filter.options.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => filter.onChange(option.id)}
                  className={cn(
                    "gap-2",
                    filter.value === option.id && "bg-primary/10 text-primary"
                  )}
                >
                  {option.icon && <option.icon className="h-4 w-4" />}
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        {/* Date Range Filter */}
        {dateRange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "gap-2 h-10",
                  (dateRange.from || dateRange.to) && "border-primary/50 bg-primary/5"
                )}
              >
                <Calendar className="h-4 w-4" />
                Date Range
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => dateRange.onFromChange(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => dateRange.onToChange(e.target.value)}
                    className="h-9"
                  />
                </div>
                {(dateRange.from || dateRange.to) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      dateRange.onFromChange("");
                      dateRange.onToChange("");
                    }}
                  >
                    Clear dates
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Advanced Filters Toggle */}
        {showAdvancedFilters && (
          <Button
            variant="outline"
            className={cn("gap-2 h-10", showAdvanced && "bg-muted")}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-4 w-4" />
            More Filters
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        )}

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="gap-1.5 h-10 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear all
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && advancedFilters && (
        <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
          {advancedFilters}
        </div>
      )}
    </div>
  );
}
