import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, UserMinus, Award } from "lucide-react";
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

export default function FriendProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [totalWeight, setTotalWeight] = useState(0);
  const [badges, setBadges] = useState<{ emoji: string; title: string; description: string }[]>([]);
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

        {/* Remove friend */}
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
