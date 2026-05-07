import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarPlan {
  id: string;
  planned_date: string; // YYYY-MM-DD
}

interface MyPlansCalendarProps {
  plans: CalendarPlan[];
  selectedDate: string | null; // YYYY-MM-DD or null
  onSelectDate: (date: string | null) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function MyPlansCalendar({ plans, selectedDate, onSelectDate }: MyPlansCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = fmt(today);

  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => {
    const base = selectedDate ? new Date(selectedDate) : today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const planDateSet = useMemo(() => {
    const s = new Set<string>();
    plans.forEach((p) => s.add(p.planned_date));
    return s;
  }, [plans]);

  const cells = useMemo(() => {
    const first = new Date(viewMonth.year, viewMonth.month, 1);
    const startWeekday = first.getDay(); // 0 = Sun
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const arr: Array<{ date: Date; str: string } | null> = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewMonth.year, viewMonth.month, d);
      arr.push({ date, str: fmt(date) });
    }
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewMonth]);

  const goPrev = () => {
    setViewMonth((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }
    );
  };
  const goNext = () => {
    setViewMonth((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }
    );
  };

  const handleCellTap = (str: string) => {
    if (selectedDate === str) onSelectDate(null);
    else onSelectDate(str);
  };

  return (
    <div
      style={{
        background: "hsl(var(--card))",
        borderRadius: 12,
        padding: 12,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goPrev}
          aria-label="이전 달"
          className="p-1 rounded-md hover:bg-secondary/60"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <p style={{ fontSize: 15, fontWeight: 500, color: "hsl(var(--foreground))" }}>
          {viewMonth.year}년 {viewMonth.month + 1}월
        </p>
        <button
          type="button"
          onClick={goNext}
          aria-label="다음 달"
          className="p-1 rounded-md hover:bg-secondary/60"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            style={{
              fontSize: 12,
              textAlign: "center",
              color:
                i === 0
                  ? "hsl(var(--brand-coral))"
                  : i === 6
                  ? "#3B82F6"
                  : "hsl(var(--muted-foreground))",
              padding: "4px 0",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`e-${idx}`} style={{ height: 36 }} />;
          const isToday = cell.str === todayStr;
          const isSelected = cell.str === selectedDate;
          const hasPlan = planDateSet.has(cell.str);
          const isPast = cell.date < today && !isToday;
          const weekday = cell.date.getDay();
          const baseColor =
            weekday === 0 ? "hsl(var(--brand-coral))" : weekday === 6 ? "#3B82F6" : "hsl(var(--foreground))";
          let bg = "transparent";
          let color = baseColor;
          if (isToday) {
            bg = "hsl(var(--brand-lime))";
            color = "#fff";
          } else if (isSelected) {
            bg = "hsl(var(--brand-lime))";
            color = "hsl(var(--brand-forest))";
          }
          return (
            <button
              key={cell.str}
              type="button"
              onClick={() => handleCellTap(cell.str)}
              style={{
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isPast ? 0.4 : 1,
                position: "relative",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  background: bg,
                  color,
                  fontWeight: isToday || isSelected ? 600 : 400,
                }}
              >
                {cell.date.getDate()}
              </span>
              {hasPlan && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: "hsl(var(--brand-lime))",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
