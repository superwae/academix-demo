import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

interface AccordionContextValue {
  openItems: Set<string>;
  toggleItem: (id: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
  defaultOpen?: string[];
  /** 'single' keeps at most one item open; 'multiple' (default) allows many. */
  type?: 'single' | 'multiple';
  /** In 'single' mode, allow closing the open item by clicking it again. */
  collapsible?: boolean;
}

export function Accordion({
  children,
  className,
  defaultOpen = [],
  type = 'multiple',
  collapsible = true,
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set(defaultOpen));

  const toggleItem = React.useCallback(
    (id: string) => {
      setOpenItems((prev) => {
        const isOpen = prev.has(id);
        if (type === 'single') {
          if (isOpen) return collapsible ? new Set() : prev;
          return new Set([id]);
        }
        const next = new Set(prev);
        if (isOpen) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [type, collapsible]
  );

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={cn('space-y-2', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemContextValue {
  itemId: string;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

interface AccordionItemProps {
  /** Unique id for the item. `value` is accepted as an alias (Radix-style API). */
  id?: string;
  value?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccordionItem({ id, value, children, className }: AccordionItemProps) {
  const itemId = id ?? value ?? '';
  return (
    <AccordionItemContext.Provider value={{ itemId }}>
      <div className={cn('border rounded-lg overflow-hidden', className)}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error('AccordionTrigger must be used within Accordion');

  const itemContext = React.useContext(AccordionItemContext);
  if (!itemContext) throw new Error('AccordionTrigger must be used within AccordionItem');

  const isOpen = context.openItems.has(itemContext.itemId);

  return (
    <button
      type="button"
      onClick={() => context.toggleItem(itemContext.itemId)}
      className={cn(
        'w-full flex items-center justify-between p-4 text-start hover:bg-muted/50 transition-colors',
        className
      )}
    >
      <span className="font-medium">{children}</span>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </motion.div>
    </button>
  );
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionContent({ children, className }: AccordionContentProps) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error('AccordionContent must be used within Accordion');

  const itemContext = React.useContext(AccordionItemContext);
  if (!itemContext) throw new Error('AccordionContent must be used within AccordionItem');

  const isOpen = context.openItems.has(itemContext.itemId);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className={cn('p-4 pt-0', className)}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

