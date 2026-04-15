import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Check, Flag, X, Pencil, ArrowUp, ArrowDown, Calendar, Timer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRestTimer } from "@/hooks/useRestTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SetInput from "@/components/SetInput";
import InlineRestTimer from "@/components/InlineRestTimer";
import { toast } from "sonner";

interface SetData {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
  sort_order: number;
}

interface ExerciseData {
  id: string;
  name: string;
  sort_order: number;
  rest_seconds: number;
  sets: SetData[];
}

interface WorkoutData {
  id: string;
  name: string;
  sort_order: number;
  day_of_week: string | null;
  exercises: ExerciseData[];
}

const DAYS_OF_WEEK = [
  { value: "segunda", label: "SEG" },
  { value: "terca", label: "TER" },
  { value: "quarta", label: "QUA" },
  { value: "quinta", label: "QUI" },
  { value: "sexta", label: "SEX" },
  { value: "sabado", label: "SÁB" },
  { value: "domingo", label: "DOM" },
];

export default function WorkoutPage() {
  const { user } = useAuth();
  const { startTimer, stopTimer, isRunning, activeSetId } = useRestTimer();
  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{ workoutName: string; totalWeight: number; totalSets: number; totalExercises: number } | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showDayPicker, setShowDayPicker] = useState<string | null>(null);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<"up" | "down" | null>(null);

  const loadWorkouts = async () => {
    if (!user) return;
    
    const [wRes, exRes, sRes] = await Promise.all([
      supabase.from("workouts").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }),
      supabase.from("exercises").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("sets").select("*").eq("user_id", user.id).order("sort_order"),
    ]);

    const wData = wRes.data || [];
    const exData = exRes.data || [];
    const sData = sRes.data || [];

    const TEN_HOURS = 10 * 60 * 60 * 1000;
    const now = Date.now();
    const staleSetIds: string[] = [];
    for (const s of sData) {
      if (s.completed && s.completed_at) {
        const completedAt = new Date(s.completed_at).getTime();
        if (now - completedAt > TEN_HOURS) {
          s.completed = false;
          staleSetIds.push(s.id);
        }
      }
    }
    if (staleSetIds.length > 0) {
      supabase.from("sets").update({ completed: false }).in("id", staleSetIds).then(() => {});
    }

    const setsByExercise = new Map<string, SetData[]>();
    for (const s of sData) {
      const arr = setsByExercise.get(s.exercise_id) || [];
      arr.push({ id: s.id, weight: Number(s.weight), reps: s.reps, completed: s.completed, sort_order: s.sort_order });
      setsByExercise.set(s.exercise_id, arr);
    }

    const exercisesByWorkout = new Map<string, ExerciseData[]>();
    for (const ex of exData) {
      const arr = exercisesByWorkout.get(ex.workout_id) || [];
      arr.push({ id: ex.id, name: ex.name, sort_order: ex.sort_order, rest_seconds: (ex as any).rest_seconds ?? 60, sets: setsByExercise.get(ex.id) || [] });
      exercisesByWorkout.set(ex.workout_id, arr);
    }

    const fullWorkouts: WorkoutData[] = wData.map((w, i) => ({
      id: w.id,
      name: w.name,
      sort_order: w.sort_order ?? i,
      day_of_week: w.day_of_week ?? null,
      exercises: exercisesByWorkout.get(w.id) || [],
    }));

    setWorkouts(fullWorkouts);
    setLoading(false);
  };

  useEffect(() => { loadWorkouts(); }, [user]);

  const createWorkout = async () => {
    if (!user || !newWorkoutName.trim()) return;
    const sortOrder = workouts.length;
    const { data, error } = await supabase.from("workouts").insert({
      user_id: user.id,
      name: newWorkoutName.trim(),
      sort_order: sortOrder,
    }).select().single();
    if (error || !data) { toast.error("Erro ao criar treino"); return; }
    setWorkouts(prev => [...prev, { id: data.id, name: data.name, sort_order: sortOrder, day_of_week: null, exercises: [] }]);
    setNewWorkoutName("");
    setShowNewWorkout(false);
    toast.success("Treino criado! 💪");
  };

  const renameWorkout = async (workoutId: string) => {
    if (!editingName.trim()) { setEditingWorkoutId(null); return; }
    setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, name: editingName.trim() } : w));
    setEditingWorkoutId(null);
    await supabase.from("workouts").update({ name: editingName.trim() }).eq("id", workoutId);
    toast.success("Nome atualizado!");
  };

  const setDayOfWeek = async (workoutId: string, day: string | null) => {
    setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, day_of_week: day } : w));
    setShowDayPicker(null);
    await supabase.from("workouts").update({ day_of_week: day }).eq("id", workoutId);
  };

  const moveWorkout = useCallback(async (workoutId: string, direction: "up" | "down") => {
    const idx = workouts.findIndex(w => w.id === workoutId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= workouts.length) return;

    // Trigger animation
    setAnimatingId(workoutId);
    setAnimDir(direction);

    // Optimistic swap after brief delay for animation
    setTimeout(async () => {
      const newWorkouts = [...workouts];
      [newWorkouts[idx], newWorkouts[targetIdx]] = [newWorkouts[targetIdx], newWorkouts[idx]];
      // Update sort_order
      const updated = newWorkouts.map((w, i) => ({ ...w, sort_order: i }));
      setWorkouts(updated);
      setAnimatingId(null);
      setAnimDir(null);

      // Persist both sort orders
      await Promise.all([
        supabase.from("workouts").update({ sort_order: updated[idx].sort_order }).eq("id", updated[idx].id),
        supabase.from("workouts").update({ sort_order: updated[targetIdx].sort_order }).eq("id", updated[targetIdx].id),
      ]);
    }, 250);
  }, [workouts]);

  const addExercise = async (workoutId: string) => {
    if (!user) return;
    const name = prompt("Nome do exercício:");
    if (!name?.trim()) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error("Nome muito curto (mínimo 2 caracteres)");
      return;
    }
    if (trimmedName.length > 100) {
      toast.error("Nome muito longo (máximo 100 caracteres)");
      return;
    }
    const workout = workouts.find(w => w.id === workoutId);
    const sortOrder = workout ? workout.exercises.length : 0;
    const { data, error } = await supabase.from("exercises").insert({
      workout_id: workoutId,
      user_id: user.id,
      name: trimmedName,
      sort_order: sortOrder,
    }).select().single();
    if (error || !data) { toast.error("Erro ao adicionar exercício"); return; }
    setWorkouts(prev => prev.map(w => w.id === workoutId ? {
      ...w,
      exercises: [...w.exercises, { id: data.id, name: data.name, sort_order: data.sort_order, rest_seconds: (data as any).rest_seconds ?? 60, sets: [] }],
    } : w));
  };

  const addSet = async (exerciseId: string) => {
    if (!user) return;
    const exercise = workouts.flatMap(w => w.exercises).find(e => e.id === exerciseId);
    const sortOrder = exercise ? exercise.sets.length : 0;
    const { data, error } = await supabase.from("sets").insert({
      exercise_id: exerciseId,
      user_id: user.id,
      weight: 0,
      reps: 0,
      sort_order: sortOrder,
    }).select().single();
    if (error || !data) { toast.error("Erro ao adicionar série"); return; }
    setWorkouts(prev => prev.map(w => ({
      ...w,
      exercises: w.exercises.map(ex => ex.id === exerciseId ? {
        ...ex,
        sets: [...ex.sets, { id: data.id, weight: Number(data.weight), reps: data.reps, completed: data.completed, sort_order: data.sort_order }],
      } : ex),
    })));
  };

  const updateSet = async (setId: string, field: string, value: any, exerciseRestSeconds?: number) => {
    setWorkouts(prev => prev.map(w => ({
      ...w,
      exercises: w.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s),
      })),
    })));
    const updateData: any = { [field]: value };
    if (field === "completed" && value === true) {
      updateData.completed_at = new Date().toISOString();
      startTimer(exerciseRestSeconds ?? 60, setId);
    }
    if (field === "completed" && value === false) {
      if (activeSetId === setId) {
        stopTimer();
      }
    }
    await supabase.from("sets").update(updateData).eq("id", setId);
  };

  const updateExerciseRest = async (exerciseId: string, restSeconds: number) => {
    setWorkouts(prev => prev.map(w => ({
      ...w,
      exercises: w.exercises.map(ex => ex.id === exerciseId ? { ...ex, rest_seconds: restSeconds } : ex),
    })));
    await supabase.from("exercises").update({ rest_seconds: restSeconds } as any).eq("id", exerciseId);
  };

  const deleteSet = async (setId: string) => {
    setWorkouts(prev => prev.map(w => ({
      ...w,
      exercises: w.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.filter(s => s.id !== setId),
      })),
    })));
    await supabase.from("sets").delete().eq("id", setId);
  };

  const deleteExercise = async (exerciseId: string) => {
    setWorkouts(prev => prev.map(w => ({
      ...w,
      exercises: w.exercises.filter(ex => ex.id !== exerciseId),
    })));
    await supabase.from("exercises").delete().eq("id", exerciseId);
  };

  const deleteWorkout = async (workoutId: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== workoutId));
    if (activeWorkout === workoutId) setActiveWorkout(null);
    await supabase.from("workouts").delete().eq("id", workoutId);
  };

  const finishWorkout = async (workoutId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;
    const completedSets = workout.exercises.flatMap(ex => ex.sets.filter(s => s.completed));
    const totalWeight = completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const totalSets = completedSets.length;
    const totalExercises = workout.exercises.filter(ex => ex.sets.some(s => s.completed)).length;
    setSummaryData({ workoutName: workout.name, totalWeight, totalSets, totalExercises });
    setShowSummary(true);

    setWorkouts(prev => prev.map(w => w.id === workoutId ? {
      ...w,
      exercises: w.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({ ...s, completed: false })),
      })),
    } : w));
    setActiveWorkout(null);

    const allSetIds = workout.exercises.flatMap(ex => ex.sets.map(s => s.id));
    if (allSetIds.length > 0) {
      await supabase.from("sets").update({ completed: false }).in("id", allSetIds);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-primary neon-text">TREINOS</h1>
          <Button
            onClick={() => setShowNewWorkout(!showNewWorkout)}
            size="sm"
            className="gradient-primary text-primary-foreground font-display"
          >
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        </div>

        {showNewWorkout && (
          <div className="glass rounded-xl p-4 space-y-3 animate-slide-up">
            <Input
              value={newWorkoutName}
              onChange={(e) => setNewWorkoutName(e.target.value)}
              placeholder="Nome do treino (ex: Peito e Tríceps)"
              className="bg-muted border-border"
              onKeyDown={(e) => e.key === "Enter" && createWorkout()}
            />
            <Button onClick={createWorkout} className="w-full gradient-primary text-primary-foreground font-display">
              CRIAR TREINO
            </Button>
          </div>
        )}

        {workouts.length === 0 && !showNewWorkout && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Nenhum treino ainda</p>
            <p className="text-sm">Crie seu primeiro treino! 🏋️</p>
          </div>
        )}

        {workouts.map((workout, wIdx) => (
          <div
            key={workout.id}
            className={`glass rounded-xl overflow-hidden transition-transform duration-250 ${
              animatingId === workout.id
                ? animDir === "up"
                  ? "-translate-y-2 scale-[1.02]"
                  : "translate-y-2 scale-[1.02]"
                : ""
            }`}
            style={{ transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease" }}
          >
            {/* Workout header */}
            <div className="flex items-center p-3 gap-2">
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveWorkout(workout.id, "up")}
                  disabled={wIdx === 0}
                  className="p-0.5 rounded text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveWorkout(workout.id, "down")}
                  disabled={wIdx === workouts.length - 1}
                  className="p-0.5 rounded text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Name / edit */}
              <button
                onClick={() => setActiveWorkout(activeWorkout === workout.id ? null : workout.id)}
                className="flex-1 text-left min-w-0"
              >
                {editingWorkoutId === workout.id ? (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") renameWorkout(workout.id); if (e.key === "Escape") setEditingWorkoutId(null); }}
                      onBlur={() => renameWorkout(workout.id)}
                      className="h-7 text-xs bg-muted border-border"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="font-display font-bold text-sm text-foreground truncate">{workout.name}</h2>
                    {workout.day_of_week && (
                      <span className="text-[10px] font-display font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary shrink-0">
                        {DAYS_OF_WEEK.find(d => d.value === workout.day_of_week)?.label}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingWorkoutId(workout.id); setEditingName(workout.name); }}
                  className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDayPicker(showDayPicker === workout.id ? null : workout.id); }}
                  className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveWorkout(activeWorkout === workout.id ? null : workout.id); }}
                  className="flex items-center gap-1 p-1 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground">{workout.exercises.length} exerc.</span>
                  {activeWorkout === workout.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Day picker */}
            {showDayPicker === workout.id && (
              <div className="px-3 pb-2 animate-slide-up">
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.value}
                      onClick={() => setDayOfWeek(workout.id, workout.day_of_week === day.value ? null : day.value)}
                      className={`text-[10px] font-display font-bold px-2 py-1 rounded-md transition-all ${
                        workout.day_of_week === day.value
                          ? "gradient-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeWorkout === workout.id && (
              <div className="px-4 pb-4 space-y-4 animate-slide-up">
                {workout.exercises.map((exercise) => (
                  <div key={exercise.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-foreground">{exercise.name}</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Timer className="w-3 h-3 text-muted-foreground" />
                          <select
                            value={exercise.rest_seconds}
                            onChange={(e) => updateExerciseRest(exercise.id, Number(e.target.value))}
                            className="bg-transparent text-[10px] font-display font-bold text-primary border border-border rounded px-1 py-0.5 focus:outline-none focus:border-primary"
                          >
                            <option value={15}>15s</option>
                            <option value={30}>30s</option>
                            <option value={45}>45s</option>
                            <option value={60}>1:00</option>
                            <option value={90}>1:30</option>
                            <option value={120}>2:00</option>
                            <option value={150}>2:30</option>
                            <option value={180}>3:00</option>
                          </select>
                        </div>
                        <button onClick={() => deleteExercise(exercise.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>

                    {exercise.sets.length > 0 && (
                      <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 text-[10px] font-display text-muted-foreground px-1">
                        <span>SÉRIE</span>
                        <span>PESO(kg)</span>
                        <span>REPS</span>
                        <span>✅</span>
                        <span></span>
                      </div>
                    )}

                    {exercise.sets.map((set, idx) => (
                      <div key={set.id} className="contents">
                        <div
                          className={`grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-center px-1 ${
                            set.completed ? "opacity-60" : ""
                          }`}
                        >
                          <span className="text-xs font-display text-muted-foreground">{idx + 1}</span>
                          <SetInput value={set.weight} field="weight" onSave={(v) => updateSet(set.id, "weight", v)} />
                          <SetInput value={set.reps} field="reps" onSave={(v) => updateSet(set.id, "reps", v)} />
                          <button
                            onClick={() => updateSet(set.id, "completed", !set.completed, exercise.rest_seconds)}
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                              set.completed
                                ? "bg-success text-success-foreground"
                                : "bg-muted border border-border hover:border-primary"
                            }`}
                          >
                            {set.completed && <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => deleteSet(set.id)}>
                            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                        <InlineRestTimer setId={set.id} />
                      </div>
                    ))}

                    <button
                      onClick={() => addSet(exercise.id)}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Série
                    </button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <button
                    onClick={() => addExercise(workout.id)}
                    className="flex-1 py-2 text-xs font-display font-medium rounded-lg border border-dashed border-primary/50 text-primary hover:bg-primary/10 transition-all"
                  >
                    + Exercício
                  </button>
                  <button
                    onClick={() => deleteWorkout(workout.id)}
                    className="py-2 px-3 text-xs rounded-lg border border-dashed border-destructive/50 text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => finishWorkout(workout.id)}
                  className="w-full py-3 rounded-lg gradient-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 neon-box"
                >
                  <Flag className="w-4 h-4" /> FINALIZAR TREINO
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary overlay */}
      {showSummary && summaryData && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-2xl p-6 max-w-sm w-full space-y-5 text-center animate-slide-up relative">
            <button
              onClick={() => setShowSummary(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-4xl">🏆</div>
            <h2 className="text-lg font-display font-bold text-foreground">Treino Finalizado!</h2>
            <p className="text-sm text-muted-foreground">{summaryData.workoutName}</p>
            
            <div className="glass rounded-xl p-4 space-y-3">
              <div>
                <span className="text-xs text-muted-foreground font-display">PESO TOTAL LEVANTADO</span>
                <p className="text-3xl font-display font-bold text-secondary neon-text-orange">
                  {summaryData.totalWeight.toLocaleString()}kg
                </p>
              </div>
              <div className="flex justify-center gap-6">
                <div>
                  <span className="text-xs text-muted-foreground font-display">SÉRIES</span>
                  <p className="text-lg font-display font-bold text-primary">{summaryData.totalSets}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-display">EXERCÍCIOS</span>
                  <p className="text-lg font-display font-bold text-primary">{summaryData.totalExercises}</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowSummary(false)}
              className="w-full gradient-primary text-primary-foreground font-display font-bold neon-box"
            >
              FECHAR
            </Button>
          </div>
        </div>
      )}

      
    </div>
  );
}
