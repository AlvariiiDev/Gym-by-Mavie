import { Timer, X } from "lucide-react";
import { useRestTimer } from "@/hooks/useRestTimer";

const PRESETS = [
  { label: "30s", value: 30 },
  { label: "1:00", value: 60 },
  { label: "1:30", value: 90 },
  { label: "2:00", value: 120 },
];

export default function RestTimer() {
  const {
    isOpen, setIsOpen, seconds, isRunning,
    startTimer, stopTimer, progress, presetDuration, setPresetDuration,
  } = useRestTimer();

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full gradient-primary flex items-center justify-center neon-box animate-pulse-neon"
      >
        <Timer className="w-6 h-6 text-primary-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-64 glass rounded-xl p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-bold text-primary neon-text">DESCANSO</h3>
        <button onClick={() => { stopTimer(); setIsOpen(false); }}>
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Timer display */}
      <div className="text-center">
        <span className={`text-4xl font-display font-bold ${seconds === 0 && !isRunning ? 'text-success' : 'text-primary neon-text'}`}>
          {formatTime(seconds)}
        </span>
        {isRunning && (
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full gradient-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Preset selector - shows which one is the auto-start default */}
      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => {
              setPresetDuration(p.value);
              startTimer(p.value);
            }}
            className={`py-1.5 px-1 text-xs font-display font-medium rounded-md transition-all ${
              presetDuration === p.value && !isRunning
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        ⏱ Auto-start ao completar série ({PRESETS.find(p => p.value === presetDuration)?.label || `${presetDuration}s`})
      </p>

      {isRunning && (
        <button
          onClick={stopTimer}
          className="w-full py-2 text-xs font-display font-bold rounded-md bg-destructive text-destructive-foreground"
        >
          PARAR
        </button>
      )}
    </div>
  );
}
