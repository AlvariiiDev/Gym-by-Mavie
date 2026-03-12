import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, UserMinus, Award, Dumbbell, Trophy, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import PRHistoryChart from "@/components/PRHistoryChart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AvatarDisplay from "@/components/AvatarDisplay";
import { getRankTier, getRankLabel, getLevel } from "@/lib/avatars";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ExercisePR {
  id: string;
  name: string;
  maxWeight: number;
}

interface WorkoutWithPRs {
  id: string;
  name: string;
  day_of_week: string | null;
  exercises: ExercisePR[];
}

export default function FriendProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [totalWeight, setTotalWeight] = useState(0);
  const [badges, setBadges] = useState<{ emoji: string; title: string; description: string }[]>([]);
  const [workoutsWithPRs, setWorkoutsWithPRs] = useState<WorkoutWithPRs[]>([]);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      setProfile(p);

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data: sets } = await supabase
        .from("sets")
        .select("weight, reps")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .gte("completed_at", weekStart.toISOString());

      const total = (sets || []).reduce((sum, s) => sum + Number(s.weight) * s.reps, 0);
      setTotalWeight(total);

      const earnedBadges: typeof badges = [];
      if (total >= 1000) {
        earnedBadges.push({ emoji: "🏋️", title: "Tonelada Levantada", description: `${total.toLocaleString()}kg total levantado` });
      }
      if (total >= 10000) {
        earnedBadges.push({ emoji: "🔥", title: "Máquina de Ferro", description: "10 toneladas levantadas!" });
      }
      setBadges(earnedBadges);

      // Load workouts with exercises and PRs
      const { data: workouts } = await supabase
        .from("workouts")
        .select("id, name, day_of_week, sort_order")
        .eq("user_id", userId)
        .order("sort_order");

      if (workouts && workouts.length > 0) {
        const { data: exercises } = await supabase
          .from("exercises")
          .select("id, name, workout_id, sort_order")
          .in("workout_id", workouts.map(w => w.id))
          .order("sort_order");

        const { data: allSets } = await supabase
          .from("sets")
          .select("exercise_id, weight")
          .eq("user_id", userId)
          .not("completed_at", "is", null);

        const prMap = new Map<string, number>();
        (allSets || []).forEach(s => {
          const w = Number(s.weight);
          const current = prMap.get(s.exercise_id) || 0;
          if (w > current) prMap.set(s.exercise_id, w);
        });

        const result: WorkoutWithPRs[] = workouts.map(w => ({
          id: w.id,
          name: w.name,
          day_of_week: w.day_of_week,
          exercises: (exercises || [])
            .filter(e => e.workout_id === w.id)
            .map(e => ({
              name: e.name,
              maxWeight: prMap.get(e.id) || 0,
            })),
        }));
        setWorkoutsWithPRs(result);
      }

      setLoading(false);
    };
    load();
  }, [userId]);

  const removeFriend = async () => {
    if (!user || !userId) return;

    await supabase
      .from("friendships")
      .delete()
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`);

    toast.success("Amigo removido");
    navigate("/friends");
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tier = getRankTier(totalWeight);
  const level = getLevel(totalWeight);

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/friends")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>

        {/* Profile card */}
        <div className="glass rounded-xl p-6 text-center space-y-4">
          <AvatarDisplay avatarId={profile.avatar_id} size="lg" showName level={level} />
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">{profile.username}</h1>
            <span className={`text-sm font-display font-medium ${
              tier === 'gold' ? 'text-gold' : tier === 'silver' ? 'text-silver' : 'text-bronze'
            }`}>
              {getRankLabel(tier)}
            </span>
          </div>
          <div className="glass rounded-lg p-3">
            <span className="text-xs text-muted-foreground font-display">PESO LEVANTADO NA SEMANA</span>
            <p className="text-2xl font-display font-bold text-secondary neon-text-orange">
              {totalWeight.toLocaleString()}kg
            </p>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" /> CONQUISTAS
            </h2>
            {badges.map((badge, idx) => (
              <div key={idx} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
                <span className="text-2xl">{badge.emoji}</span>
                <div>
                  <p className="text-sm font-display font-bold text-foreground">{badge.title}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Workouts & PRs */}
        {workoutsWithPRs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" /> TREINOS & PRs
            </h2>
            {workoutsWithPRs.map((workout) => (
              <div key={workout.id} className="glass rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-display font-bold text-foreground">{workout.name}</span>
                    {workout.day_of_week && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-display uppercase">
                        {workout.day_of_week}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{workout.exercises.length} exerc.</span>
                    {expandedWorkout === workout.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expandedWorkout === workout.id && workout.exercises.length > 0 && (
                  <div className="border-t border-border/50 px-3 pb-3 space-y-2 pt-2">
                    {workout.exercises.map((ex, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/20">
                        <span className="text-sm text-foreground">{ex.name}</span>
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-secondary" />
                          <span className="text-sm font-display font-bold text-secondary neon-text-orange">
                            {ex.maxWeight > 0 ? `${ex.maxWeight}kg` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full py-3 rounded-xl glass text-destructive font-display font-bold text-sm flex items-center justify-center gap-2 hover:bg-destructive/10 transition-all">
              <UserMinus className="w-4 h-4" /> REMOVER AMIGO
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Remover amigo?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja remover <strong>{profile.username}</strong> da sua lista de amigos?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-display">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={removeFriend} className="bg-destructive text-destructive-foreground font-display">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
