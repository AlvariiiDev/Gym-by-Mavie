import { useState, useEffect } from "react";
import { LogOut, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signOutUser } from "@/lib/supabase-helpers";
import AvatarDisplay from "@/components/AvatarDisplay";
import { getRankTier, getRankLabel, getLevel } from "@/lib/avatars";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Badge {
  emoji: string;
  title: string;
  description: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [totalWeight, setTotalWeight] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setProfile(p);

      // Monthly weight
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: sets } = await supabase
        .from("sets")
        .select("weight, reps")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", monthStart.toISOString());

      const total = (sets || []).reduce((sum, s) => sum + Number(s.weight) * s.reps, 0);
      setTotalWeight(total);

      // Calculate badges
      const earnedBadges: Badge[] = [];

      // Today's heaviest set
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todaySets } = await supabase
        .from("sets")
        .select("weight, reps")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", today.toISOString());

      if (todaySets && todaySets.length > 0) {
        const maxSet = todaySets.reduce((max, s) => {
          const vol = Number(s.weight) * s.reps;
          return vol > max ? vol : max;
        }, 0);
        if (maxSet > 0) {
          earnedBadges.push({
            emoji: "💪",
            title: "Série Monstro do Dia",
            description: `${maxSet.toLocaleString()}kg em uma série hoje`,
          });
        }
      }

      if (total >= 1000) {
        earnedBadges.push({
          emoji: "🏋️",
          title: "Tonelada Levantada",
          description: `${total.toLocaleString()}kg total levantado`,
        });
      }

      if (total >= 10000) {
        earnedBadges.push({
          emoji: "🔥",
          title: "Máquina de Ferro",
          description: "10 toneladas levantadas!",
        });
      }

      setBadges(earnedBadges);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleLogout = async () => {
    await signOutUser();
    toast.success("Até logo! 👋");
    navigate("/");
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
        <div className="space-y-3">
          <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> CONQUISTAS
          </h2>
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Complete séries para ganhar badges! 🏅
            </p>
          ) : (
            badges.map((badge, idx) => (
              <div key={idx} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
                <span className="text-2xl">{badge.emoji}</span>
                <div>
                  <p className="text-sm font-display font-bold text-foreground">{badge.title}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl glass text-destructive font-display font-bold text-sm flex items-center justify-center gap-2 hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" /> SAIR
        </button>
      </div>
    </div>
  );
}
