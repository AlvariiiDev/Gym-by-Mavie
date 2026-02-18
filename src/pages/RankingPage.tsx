import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AvatarDisplay from "@/components/AvatarDisplay";
import { getRankTier, getRankLabel, getLevel } from "@/lib/avatars";

interface RankedUser {
  user_id: string;
  username: string;
  avatar_id: number;
  totalWeight: number;
}

type Period = "daily" | "weekly" | "monthly";

export default function RankingPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("daily");
  const [ranking, setRanking] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRanking = async () => {
    if (!user) return;
    setLoading(true);

    // Get friends + self
    const { data: fData } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const userIds = [user.id];
    (fData || []).forEach(f => {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      userIds.push(friendId);
    });

    // Date filter
    const now = new Date();
    let since: string;
    if (period === "daily") {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === "weekly") {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      since = d.toISOString();
    } else {
      since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", userIds);

    // Get completed sets for each user
    const ranked: RankedUser[] = [];
    for (const uid of userIds) {
      const { data: sets } = await supabase
        .from("sets")
        .select("weight, reps")
        .eq("user_id", uid)
        .not("completed_at", "is", null)
        .gte("completed_at", since);

      const total = (sets || []).reduce((sum, s) => sum + Number(s.weight) * s.reps, 0);
      const profile = (profiles || []).find(p => p.user_id === uid);
      if (profile) {
        ranked.push({
          user_id: uid,
          username: profile.username,
          avatar_id: profile.avatar_id,
          totalWeight: total,
        });
      }
    }

    ranked.sort((a, b) => b.totalWeight - a.totalWeight);
    setRanking(ranked);
    setLoading(false);
  };

  useEffect(() => { loadRanking(); }, [user, period]);

  const periods: { key: Period; label: string }[] = [
    { key: "daily", label: "Hoje" },
    { key: "weekly", label: "Semana" },
    { key: "monthly", label: "Mês" },
  ];

  const podiumColors = ["text-gold", "text-silver", "text-bronze"];
  const podiumEmojis = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-xl font-display font-bold text-primary neon-text flex items-center gap-2">
          <Trophy className="w-5 h-5" /> RANKING
        </h1>

        {/* Period tabs */}
        <div className="flex rounded-lg bg-muted p-1">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`flex-1 py-2 rounded-md text-xs font-display font-medium transition-all ${
                period === p.key
                  ? "bg-primary text-primary-foreground neon-box"
                  : "text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ranking.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Adicione amigos para ver o ranking! 🏆
          </p>
        ) : (
          <>
            {/* Podium */}
            {ranking.length >= 1 && (
              <div className="flex items-end justify-center gap-4 py-4">
                {/* 2nd place */}
                {ranking.length >= 2 && (
                  <div className="flex flex-col items-center">
                    <AvatarDisplay avatarId={ranking[1].avatar_id} size="md" level={getLevel(ranking[1].totalWeight)} />
                    <span className="text-xs font-display font-bold text-silver mt-1">
                      {ranking[1].username}
                    </span>
                    <span className="text-lg">{podiumEmojis[1]}</span>
                    <div className="w-16 h-16 bg-muted rounded-t-lg flex items-center justify-center">
                      <span className="text-xs font-display text-muted-foreground">
                        {ranking[1].totalWeight.toLocaleString()}kg
                      </span>
                    </div>
                  </div>
                )}

                {/* 1st place */}
                <div className="flex flex-col items-center">
                  <AvatarDisplay avatarId={ranking[0].avatar_id} size="lg" level={getLevel(ranking[0].totalWeight)} />
                  <span className="text-xs font-display font-bold text-gold mt-1 neon-text-orange">
                    {ranking[0].username}
                  </span>
                  <span className="text-2xl">{podiumEmojis[0]}</span>
                  <div className="w-20 h-24 gradient-orange rounded-t-lg flex items-center justify-center neon-box-orange">
                    <span className="text-xs font-display font-bold text-primary-foreground">
                      {ranking[0].totalWeight.toLocaleString()}kg
                    </span>
                  </div>
                </div>

                {/* 3rd place */}
                {ranking.length >= 3 && (
                  <div className="flex flex-col items-center">
                    <AvatarDisplay avatarId={ranking[2].avatar_id} size="sm" level={getLevel(ranking[2].totalWeight)} />
                    <span className="text-xs font-display font-bold text-bronze mt-1">
                      {ranking[2].username}
                    </span>
                    <span className="text-lg">{podiumEmojis[2]}</span>
                    <div className="w-14 h-12 bg-muted rounded-t-lg flex items-center justify-center">
                      <span className="text-[10px] font-display text-muted-foreground">
                        {ranking[2].totalWeight.toLocaleString()}kg
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full list */}
            <div className="space-y-2">
              {ranking.map((r, idx) => {
                const tier = getRankTier(r.totalWeight);
                return (
                  <div
                    key={r.user_id}
                    className={`glass rounded-xl p-3 flex items-center gap-3 ${
                      r.user_id === user?.id ? "ring-1 ring-primary neon-box" : ""
                    }`}
                  >
                    <span className={`text-sm font-display font-bold w-6 text-center ${podiumColors[idx] || "text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                    <AvatarDisplay avatarId={r.avatar_id} size="sm" level={getLevel(r.totalWeight)} />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{r.username}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {getRankLabel(tier)}
                      </span>
                    </div>
                    <span className="text-sm font-display font-bold text-secondary">
                      {r.totalWeight.toLocaleString()}kg
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
