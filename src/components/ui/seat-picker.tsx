import * as React from "react";
import { cn } from "@/lib/utils";
import { Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SeatPickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function SeatPicker({
  value,
  onChange,
  min = 1,
  max = 8,
  className,
}: SeatPickerProps) {
  const numValue = parseInt(value) || 0;

  const increment = () => {
    const next = Math.min(numValue + 1, max);
    onChange(next.toString());
  };

  const decrement = () => {
    const next = Math.max(numValue - 1, min);
    onChange(next.toString());
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3 border">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full shrink-0 border-2 hover:bg-destructive/10 hover:border-destructive/50 transition-colors"
          onClick={decrement}
          disabled={numValue <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: max }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "transition-all duration-200",
                  i < numValue
                    ? "text-primary scale-100"
                    : "text-muted-foreground/30 scale-90"
                )}
              >
                <Users className="h-4 w-4" />
              </div>
            ))}
          </div>
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {numValue || "—"}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full shrink-0 border-2 hover:bg-primary/10 hover:border-primary/50 transition-colors"
          onClick={increment}
          disabled={numValue >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
