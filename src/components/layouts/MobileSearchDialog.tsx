import type { FormEvent, ReactNode } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "../../lib/cn";

export type MobileSearchRow = {
  type: string;
  id: string;
  title: string;
  description?: string;
  url: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSearching: boolean;
  results: MobileSearchRow[];
  minQueryLength?: number;
  onSelectResult: (row: MobileSearchRow) => void;
  placeholder: string;
  renderIcon?: (type: string) => ReactNode;
};

export function MobileSearchDialog({
  open,
  onOpenChange,
  search,
  onSearchChange,
  onSubmit,
  isSearching,
  results,
  minQueryLength = 2,
  onSelectResult,
  placeholder,
  renderIcon,
}: Props) {
  const q = search.trim();
  const ready = q.length >= minQueryLength;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92dvh,900px)] w-[calc(100%-1rem)] max-w-lg flex-col gap-0 p-0 sm:max-h-[min(88vh,900px)]"
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-border/60 px-4 py-3 text-left sm:px-5">
          <DialogTitle className="text-base font-semibold">Search</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="border-b border-border/40 px-4 py-3 sm:px-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="h-11 pl-10 pr-10 text-base"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </form>
        <ScrollArea className="min-h-0 flex-1 max-h-[min(60dvh,520px)]">
          <div className="px-2 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {!ready && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Type at least {minQueryLength} characters to search.
              </p>
            )}
            {ready && isSearching && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Searching…
              </p>
            )}
            {ready && !isSearching && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found.
              </p>
            )}
            {ready &&
              !isSearching &&
              results.map((row) => (
                <button
                  key={`${row.type}-${row.id}`}
                  type="button"
                  onClick={() => onSelectResult(row)}
                  className="flex w-full min-h-[52px] items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-accent/60 active:bg-accent/80"
                >
                  <span className="mt-0.5 shrink-0 text-primary">
                    {renderIcon ? renderIcon(row.type) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-medium text-foreground">
                      {row.title}
                    </span>
                    {row.description && (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                        {row.description}
                      </span>
                    )}
                    <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {row.type}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
