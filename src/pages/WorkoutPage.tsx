import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RestTimer from "@/components/RestTimer";
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
  sets: SetData[];
}

interface WorkoutData {
  id: string;
  name: string;
  exercises: ExerciseData[];
}

export default function WorkoutPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadWorkouts = async () => {
    if (!user) return;
    const { data: wData } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!wData) { setLoading(false); return; }

    const fullWorkouts: WorkoutData[] = [];
    for (const w of wData) {
      const { data: exData } = await supabase
        .from("exercises")
        .select("*")
        .eq("workout_id", w.id)
        .order("sort_order");

      const exercises: ExerciseData[] = [];
      for (const ex of exData || []) {
        const { data: sData } = await supabase
          .from("sets")
          .select("*")
          .eq("exercise_id", ex.id)
          .order("sort_order");

        exercises.push({
          id: ex.id,
          name: ex.name,
          sort_order: ex.sort_order,
          sets: (sData || []).map(s => ({
            id: s.id,
            weight: Number(s.weight),
            reps: s.reps,
            completed: s.completed,
            sort_order: s.sort_order,
          })),
        });
      }
      fullWorkouts.push({ id: w.id, name: w.name, exercises });
    }
    setWorkouts(fullWorkouts);
    setLoading(false);
  };

  useEffect(() => { loadWorkouts(); }, [user]);

  const createWorkout = async () => {
    if (!user || !newWorkoutName.trim()) return;
    const { error } = await supabase.from("workouts").insert({
      user_id: user.id,
      name: newWorkoutName.trim(),
    });
    if (error) { toast.error("Erro ao criar treino"); return; }
    setNewWorkoutName("");
    setShowNewWorkout(false);
    toast.success("Treino criado! 💪");
    loadWorkouts();
  };

  const addExercise = async (workoutId: string) => {
    if (!user) return;
    const name = prompt("Nome do exercício:");
    if (!name?.trim()) return;
    const workout = workouts.find(w => w.id === workoutId);
    const sortOrder = workout ? workout.exercises.length : 0;
    await supabase.from("exercises").insert({
      workout_id: workoutId,
      user_id: user.id,
      name: name.trim(),
      sort_order: sortOrder,
    });
    loadWorkouts();
  };

  const addSet = async (exerciseId: string) => {
    if (!user) return;
    const exercise = workouts.flatMap(w => w.exercises).find(e => e.id === exerciseId);
    const sortOrder = exercise ? exercise.sets.length : 0;
    await supabase.from("sets").insert({
      exercise_id: exerciseId,
      user_id: user.id,
      weight: 0,
      reps: 0,
      sort_order: sortOrder,
    });
    loadWorkouts();
  };

  const updateSet = async (setId: string, field: string, value: any) => {
    const updateData: any = { [field]: value };
    if (field === "completed" && value === true) {
      updateData.completed_at = new Date().toISOString();
    }
    await supabase.from("sets").update(updateData).eq("id", setId);
    loadWorkouts();
  };

  const deleteSet = async (setId: string) => {
    await supabase.from("sets").delete().eq("id", setId);
    loadWorkouts();
  };

  const deleteExercise = async (exerciseId: string) => {
    await supabase.from("exercises").delete().eq("id", exerciseId);
    loadWorkouts();
  };

  const deleteWorkout = async (workoutId: string) => {
    await supabase.from("workouts").delete().eq("id", workoutId);
    loadWorkouts();
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

        {workouts.map((workout) => (
          <div key={workout.id} className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setActiveWorkout(activeWorkout === workout.id ? null : workout.id)}
              className="w-full flex items-center justify-between p-4"
            >
              <h2 className="font-display font-bold text-sm text-foreground">{workout.name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {workout.exercises.length} exerc.
                </span>
                {activeWorkout === workout.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {activeWorkout === workout.id && (
              <div className="px-4 pb-4 space-y-4 animate-slide-up">
                {workout.exercises.map((exercise) => (
                  <div key={exercise.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-foreground">{exercise.name}</h3>
                      <button onClick={() => deleteExercise(exercise.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>

                    {/* Sets header */}
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
                      <div
                        key={set.id}
                        className={`grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-center px-1 ${
                          set.completed ? "opacity-60" : ""
                        }`}
                      >
                        <span className="text-xs font-display text-muted-foreground">
                          {idx + 1}
                        </span>
                        <Input
                          type="number"
                          value={set.weight || ""}
                          onChange={(e) => updateSet(set.id, "weight", Number(e.target.value))}
                          className="h-8 text-xs bg-background border-border text-center"
                        />
                        <Input
                          type="number"
                          value={set.reps || ""}
                          onChange={(e) => updateSet(set.id, "reps", Number(e.target.value))}
                          className="h-8 text-xs bg-background border-border text-center"
                        />
                        <button
                          onClick={() => updateSet(set.id, "completed", !set.completed)}
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
              </div>
            )}
          </div>
        ))}
      </div>

      <RestTimer />
    </div>
  );
}
