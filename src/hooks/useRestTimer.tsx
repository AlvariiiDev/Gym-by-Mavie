import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

interface RestTimerContextType {
  seconds: number;
  totalSeconds: number;
  isRunning: boolean;
  presetDuration: number;
  setPresetDuration: (d: number) => void;
  startTimer: (duration?: number, setId?: string) => void;
  stopTimer: () => void;
  progress: number;
  activeSetId: string | null;
}

const RestTimerContext = createContext<RestTimerContextType | null>(null);

export function useRestTimer() {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error("useRestTimer must be used within RestTimerProvider");
  return ctx;
}

function playAlarm() {
  if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400, 150, 400, 150, 400]);

  try {
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.8;

    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      osc.connect(gainNode);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    gainNode.connect(ctx.destination);

    for (let i = 0; i < 8; i++) {
      playBeep(i % 2 === 0 ? 1200 : 800, i * 0.35, 0.25);
    }

    setTimeout(() => ctx.close(), 4000);
  } catch {}
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [presetDuration, setPresetDuration] = useState(60);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setSeconds(0);
    setActiveSetId(null);
    endTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration?: number, setId?: string) => {
    const dur = duration ?? presetDuration;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTotalSeconds(dur);
    setSeconds(dur);
    endTimeRef.current = Date.now() + dur * 1000;
    setIsRunning(true);
    setActiveSetId(setId ?? null);
    setTimerKey(k => k + 1);
  }, [presetDuration]);

  useEffect(() => {
    if (!isRunning || !endTimeRef.current) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current! - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining <= 0) {
        stopTimer();
        playAlarm();
      }
    };

    tick();
    intervalRef.current = window.setInterval(tick, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, stopTimer]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isRunning && endTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setSeconds(remaining);
        if (remaining <= 0) {
          stopTimer();
          playAlarm();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isRunning, stopTimer]);

  const progress = totalSeconds > 0 ? ((totalSeconds - seconds) / totalSeconds) * 100 : 0;

  return (
    <RestTimerContext.Provider value={{
      seconds, totalSeconds, isRunning,
      presetDuration, setPresetDuration, startTimer, stopTimer, progress,
      activeSetId,
    }}>
      {children}
    </RestTimerContext.Provider>
  );
}
