import * as React from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";

interface PricePickerProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  className?: string;
}

function ScrollColumn({
  items,
  value,
  onChange,
  label,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemHeight = 40;

  React.useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0 && containerRef.current) {
      containerRef.current.scrollTo({
        top: idx * itemHeight,
        behavior: "smooth",
      });
    }
  }, [value, items]);

  const handleScroll = React.useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const idx = Math.round(scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    if (items[clamped] !== value) {
      onChange(items[clamped]);
    }
  }, [items, value, onChange, itemHeight]);

  const scrollTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const onScroll = React.useCallback(() => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(handleScroll, 80);
  }, [handleScroll]);

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-muted-foreground mb-1 font-medium">{label}</span>
      <div className="relative h-[120px] w-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-[40px] h-[40px] border-y-2 border-primary/30 bg-primary/5 rounded-md z-10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40px] bg-gradient-to-b from-popover to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40px] bg-gradient-to-t from-popover to-transparent z-10" />
        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
          onScroll={onScroll}
          style={{ paddingTop: itemHeight, paddingBottom: itemHeight }}
        >
          {items.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                "flex items-center justify-center w-full snap-center transition-all duration-150",
                item === value
                  ? "text-foreground font-bold text-lg"
                  : "text-muted-foreground text-sm opacity-60"
              )}
              style={{ height: itemHeight }}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// 0 to 200
const prices = Array.from({ length: 201 }, (_, i) => i.toString());

export function PricePicker({
  value,
  onChange,
  currency = "₪",
  className,
}: PricePickerProps) {
  const [open, setOpen] = React.useState(false);

  const numValue = Math.max(0, Math.floor(parseFloat(value) || 0));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-right font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Coins className="ml-2 h-4 w-4 text-muted-foreground" />
          {numValue > 0 ? (
            <span className="font-medium">{currency}{numValue}</span>
          ) : (
            <span>בחר מחיר</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex items-center gap-2 justify-center">
          <div className="text-xl font-bold text-muted-foreground mt-5">{currency}</div>
          <ScrollColumn
            items={prices}
            value={numValue.toString()}
            onChange={(v) => onChange(v)}
            label="מחיר"
          />
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-1.5 justify-center mt-3">
          {[10, 15, 20, 25, 30].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset.toString())}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border",
                numValue === preset
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              )}
            >
              {currency}{preset}
            </button>
          ))}
        </div>

        <Button
          className="w-full mt-3"
          size="sm"
          onClick={() => setOpen(false)}
        >
          אישור
        </Button>
      </PopoverContent>
    </Popover>
  );
}
