import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

interface RestTimerContextType {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  seconds: number;
  totalSeconds: number;
  isRunning: boolean;
  presetDuration: number;
  setPresetDuration: (d: number) => void;
  startTimer: (duration?: number) => void;
  stopTimer: () => void;
  progress: number;
}

const RestTimerContext = createContext<RestTimerContextType | null>(null);

export function useRestTimer() {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error("useRestTimer must be used within RestTimerProvider");
  return ctx;
}

function playAlarm() {
  // Vibrate aggressively
  if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400, 150, 400, 150, 400]);

  try {
    const ctx = new AudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.8; // Loud

    // Create a piercing alarm pattern that cuts through music
    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      osc.type = "square"; // Harsher, more noticeable
      osc.frequency.value = freq;
      osc.connect(gainNode);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    gainNode.connect(ctx.destination);

    // Alternating high-low alarm pattern for 3 seconds
    for (let i = 0; i < 8; i++) {
      playBeep(i % 2 === 0 ? 1200 : 800, i * 0.35, 0.25);
    }

    // Clean up after alarm finishes
    setTimeout(() => ctx.close(), 4000);
  } catch {}
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [presetDuration, setPresetDuration] = useState(60);
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    endTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration?: number) => {
    const dur = duration ?? presetDuration;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTotalSeconds(dur);
    setSeconds(dur);
    endTimeRef.current = Date.now() + dur * 1000;
    setIsRunning(true);
    setIsOpen(true);
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

    // Tick immediately to catch up if returning from background
    tick();

    intervalRef.current = window.setInterval(tick, 250); // Check 4x/sec for responsiveness

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, stopTimer]);

  // Handle visibility change - recalculate when coming back from background
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
      isOpen, setIsOpen, seconds, totalSeconds, isRunning,
      presetDuration, setPresetDuration, startTimer, stopTimer, progress,
    }}>
      {children}
    </RestTimerContext.Provider>
  );
}
