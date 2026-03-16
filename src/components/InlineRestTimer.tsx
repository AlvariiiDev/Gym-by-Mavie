import { useRestTimer } from "@/hooks/useRestTimer";
import { X } from "lucide-react";

const PRESETS = [
  { label: "30s", value: 30 },
  { label: "1:00", value: 60 },
  { label: "1:30", value: 90 },
  { label: "2:00", value: 120 },
];

interface InlineRestTimerProps {
  setId: string;
}

export default function InlineRestTimer({ setId }: InlineRestTimerProps) {
  const { seconds, isRunning, progress, presetDuration, setPresetDuration, startTimer, stopTimer, activeSetId } = useRestTimer();

  if (activeSetId !== setId) return null;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="col-span-5 bg-card/80 border border-border rounded-lg p-3 space-y-2 animate-slide-up">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-display font-bold text-primary neon-text tracking-wider">DESCANSO</span>
        <button onClick={stopTimer} className="p-0.5 rounded hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-2xl font-display font-bold tabular-nums ${
          seconds === 0 && !isRunning ? 'text-success' : 'text-primary neon-text'
        }`}>
          {formatTime(seconds)}
        </span>

        {isRunning && (
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => {
              setPresetDuration(p.value);
              startTimer(p.value, setId);
            }}
            className={`flex-1 py-1 text-[10px] font-display font-bold rounded-md transition-all ${
              presetDuration === p.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary"
            }`}
          >
            {p.label}
          </button>
        ))}

        {isRunning && (
          <button
            onClick={stopTimer}
            className="flex-1 py-1 text-[10px] font-display font-bold rounded-md bg-destructive text-destructive-foreground"
          >
            PARAR
          </button>
        )}
      </div>
    </div>
  );
}
