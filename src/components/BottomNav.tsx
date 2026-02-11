import { Dumbbell, Users, Trophy, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { path: "/workout", icon: Dumbbell, label: "Treino" },
  { path: "/friends", icon: Users, label: "Amigos" },
  { path: "/ranking", icon: Trophy, label: "Ranking" },
  { path: "/profile", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                isActive
                  ? "text-primary neon-text"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-display font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
