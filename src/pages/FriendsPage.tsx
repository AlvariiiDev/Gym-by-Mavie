import { useState, useEffect } from "react";
import { UserPlus, Check, X, Users, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AvatarDisplay from "@/components/AvatarDisplay";
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

interface FriendProfile {
  user_id: string;
  username: string;
  avatar_id: number;
}

interface FriendRequest {
  id: string;
  requester: FriendProfile;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFriends = async () => {
    if (!user) return;

    // Accepted friendships
    const { data: fData } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const friendIds = (fData || []).map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", friendIds);
      setFriends((profiles || []).map(p => ({ user_id: p.user_id, username: p.username, avatar_id: p.avatar_id })));
    } else {
      setFriends([]);
    }

    // Pending requests to me
    const { data: reqData } = await supabase
      .from("friendships")
      .select("*")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (reqData && reqData.length > 0) {
      const reqIds = reqData.map(r => r.requester_id);
      const { data: reqProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", reqIds);

      setRequests(reqData.map(r => {
        const profile = (reqProfiles || []).find(p => p.user_id === r.requester_id);
        return {
          id: r.id,
          requester: {
            user_id: r.requester_id,
            username: profile?.username || "?",
            avatar_id: profile?.avatar_id || 1,
          },
        };
      }));
    } else {
      setRequests([]);
    }
  };

  useEffect(() => { loadFriends(); }, [user]);

  const sendRequest = async () => {
    if (!user || !searchId.trim()) return;
    setLoading(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", searchId.trim())
      .maybeSingle();

    if (!profile) {
      toast.error("Usuário não encontrado");
      setLoading(false);
      return;
    }

    if (profile.user_id === user.id) {
      toast.error("Você não pode se adicionar");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: profile.user_id,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Solicitação já enviada");
      } else {
        toast.error("Erro ao enviar solicitação");
      }
    } else {
      toast.success(`Solicitação enviada para ${profile.username}! 🤝`);
      setSearchId("");
    }
    setLoading(false);
  };

  const respondRequest = async (requestId: string, accept: boolean) => {
    const req = requests.find(r => r.id === requestId);
    setRequests(prev => prev.filter(r => r.id !== requestId));
    if (accept && req) {
      setFriends(prev => [...prev, req.requester]);
    }
    toast.success(accept ? "Amigo adicionado! 🎉" : "Solicitação recusada");
    await supabase
      .from("friendships")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", requestId);
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;
    setFriends(prev => prev.filter(f => f.user_id !== friendId));
    toast.success("Amigo removido");
    await supabase
      .from("friendships")
      .delete()
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-xl font-display font-bold text-primary neon-text">AMIGOS</h1>

        {/* Add friend */}
        <div className="glass rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Adicionar Amigo
          </h2>
          <div className="flex gap-2">
            <Input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="ID do amigo"
              className="bg-muted border-border"
              onKeyDown={(e) => e.key === "Enter" && sendRequest()}
            />
            <Button
              onClick={sendRequest}
              disabled={loading}
              className="gradient-primary text-primary-foreground font-display shrink-0"
            >
              Enviar
            </Button>
          </div>
        </div>

        {/* Pending requests */}
        {requests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-display font-bold text-secondary neon-text-orange">
              SOLICITAÇÕES ({requests.length})
            </h2>
            {requests.map(req => (
              <div key={req.id} className="glass rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AvatarDisplay avatarId={req.requester.avatar_id} size="sm" />
                  <span className="font-medium text-sm">{req.requester.username}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondRequest(req.id, true)}
                    className="w-8 h-8 rounded-full bg-success flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-success-foreground" />
                  </button>
                  <button
                    onClick={() => respondRequest(req.id, false)}
                    className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-destructive-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        <div className="space-y-3">
          <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Meus Amigos ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Adicione amigos pelo ID deles! 🤜🤛
            </p>
          ) : (
            friends.map(friend => (
              <div key={friend.user_id} className="glass rounded-xl p-3 flex items-center gap-3">
                <AvatarDisplay avatarId={friend.avatar_id} size="sm" />
                <span className="font-medium text-sm">{friend.username}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
