import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ScrollTimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
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

  // Debounced scroll handler
  const scrollTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const onScroll = React.useCallback(() => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(handleScroll, 80);
  }, [handleScroll]);

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-muted-foreground mb-1 font-medium">{label}</span>
      <div className="relative h-[120px] w-16 overflow-hidden">
        {/* Highlight band */}
        <div className="pointer-events-none absolute inset-x-0 top-[40px] h-[40px] border-y-2 border-primary/30 bg-primary/5 rounded-md z-10" />
        {/* Fade top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40px] bg-gradient-to-b from-popover to-transparent z-10" />
        {/* Fade bottom */}
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

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

export function ScrollTimePicker({
  value,
  onChange,
  className,
  placeholder = "בחר שעה",
}: ScrollTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parts = value ? value.split(":") : ["08", "00"];
  const hour = parts[0] || "08";
  const minute = parts[1] || "00";

  const handleHourChange = (h: string) => {
    onChange(`${h}:${minute}`);
  };

  const handleMinuteChange = (m: string) => {
    onChange(`${hour}:${m}`);
  };

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
          <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
          {value ? (
            <span className="font-medium">{value}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex items-center gap-4 justify-center">
          <ScrollColumn
            items={minutes}
            value={minute}
            onChange={handleMinuteChange}
            label="דקה"
          />
          <div className="text-2xl font-bold text-muted-foreground mt-5">:</div>
          <ScrollColumn
            items={hours}
            value={hour}
            onChange={handleHourChange}
            label="שעה"
          />
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
