import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AVATARS } from "@/lib/avatars";
import { signUpUser, signInUser, createProfile, getProfileByUsername } from "@/lib/supabase-helpers";
import { toast } from "sonner";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fakeEmail = (uname: string) => `${uname.toLowerCase().replace(/[^a-z0-9]/g, '')}@gym.local`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (username.trim().length < 3) {
      toast.error("ID deve ter pelo menos 3 caracteres");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    const email = fakeEmail(username.trim());

    try {
      if (mode === "signup") {
        // Check if username taken
        const existing = await getProfileByUsername(username.trim());
        if (existing.data) {
          toast.error("Este ID já está em uso");
          setLoading(false);
          return;
        }

        const { data, error } = await signUpUser(email, password);
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await createProfile(data.user.id, username.trim(), selectedAvatar);
          if (profileError) throw profileError;
          toast.success("Conta criada! Bem-vindo! 💪");
          navigate("/workout");
        }
      } else {
        // For login, we need to find the email from the username
        const profile = await getProfileByUsername(username.trim());
        if (!profile.data) {
          toast.error("ID não encontrado");
          setLoading(false);
          return;
        }
        const { error } = await signInUser(email, password);
        if (error) {
          toast.error("Senha incorreta");
          setLoading(false);
          return;
        }
        toast.success("Login realizado! 🔥");
        navigate("/workout");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold neon-text text-primary">
            GYM<span className="text-secondary neon-text-orange">QUEST</span>
          </h1>
          <p className="text-muted-foreground text-sm">Treine. Compita. Evolua.</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-md text-sm font-display font-medium transition-all ${
              mode === "login" ? "bg-primary text-primary-foreground neon-box" : "text-muted-foreground"
            }`}
          >
            ENTRAR
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-md text-sm font-display font-medium transition-all ${
              mode === "signup" ? "bg-primary text-primary-foreground neon-box" : "text-muted-foreground"
            }`}
          >
            CRIAR CONTA
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Seu ID</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: guerreiro123"
              className="bg-muted border-border focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="bg-muted border-border focus:border-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Escolha seu Personagem</label>
              <div className="grid grid-cols-4 gap-2">
                {AVATARS.map((avatar) => (
                  <button
                    type="button"
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                      selectedAvatar === avatar.id
                        ? "bg-muted neon-box ring-1 ring-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center text-xl`}>
                      {avatar.emoji}
                    </div>
                    <span className="text-[9px] text-muted-foreground text-center leading-tight">
                      {avatar.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground font-display font-bold tracking-wider h-12 text-base neon-box"
          >
            {loading ? "..." : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
          </Button>
        </form>
      </div>
    </div>
  );
}
