import lutador1 from "@/assets/avatars/lutador_espinhoso_1.png";
import lutador2 from "@/assets/avatars/lutador_espinhoso_2.png";
import lutador3 from "@/assets/avatars/lutador_espinhoso_3.png";
import lutador4 from "@/assets/avatars/lutador_espinhoso_4.png";
import lutador5 from "@/assets/avatars/lutador_espinhoso_5.png";
import lutador6 from "@/assets/avatars/lutador_espinhoso_6.png";
import lutador7 from "@/assets/avatars/lutador_espinhoso_7.png";
import lutador8 from "@/assets/avatars/lutador_espinhoso_8.png";
import lutador9 from "@/assets/avatars/lutador_espinhoso_9.png";
import lutador10 from "@/assets/avatars/lutador_espinhoso_10.png";

export interface AvatarOption {
  id: number;
  name: string;
  emoji: string;
  color: string;
  levelImages?: string[];
}

const LUTADOR_IMAGES = [lutador1, lutador2, lutador3, lutador4, lutador5, lutador6, lutador7, lutador8, lutador9, lutador10];

export const AVATARS: AvatarOption[] = [
  { id: 1, name: "Lutador Espetado", emoji: "🔥", color: "from-red-500 to-orange-500", levelImages: LUTADOR_IMAGES },
  { id: 2, name: "Ninja Ágil", emoji: "🥷", color: "from-purple-600 to-indigo-600" },
  { id: 3, name: "Guerreiro Selvagem", emoji: "⚔️", color: "from-amber-600 to-red-600" },
  { id: 4, name: "Mago Musculoso", emoji: "🧙", color: "from-violet-500 to-purple-700" },
  { id: 5, name: "Cavaleiro Fitness", emoji: "🛡️", color: "from-slate-400 to-slate-600" },
  { id: 6, name: "Pirata Saltitante", emoji: "🏴‍☠️", color: "from-yellow-500 to-amber-700" },
  { id: 7, name: "Herói Mascarado", emoji: "🦸", color: "from-blue-500 to-cyan-500" },
  { id: 8, name: "Samurai Determinado", emoji: "⛩️", color: "from-red-700 to-rose-500" },
  { id: 9, name: "Cientista Maluco", emoji: "🧪", color: "from-green-400 to-emerald-600" },
  { id: 10, name: "Robô Atlético", emoji: "🤖", color: "from-cyan-400 to-blue-600" },
  { id: 11, name: "Espadachim Sombrio", emoji: "🗡️", color: "from-gray-600 to-gray-900" },
  { id: 12, name: "Atleta Lendário", emoji: "🏆", color: "from-yellow-400 to-orange-500" },
];

export function getAvatar(id: number): AvatarOption {
  return AVATARS.find(a => a.id === id) || AVATARS[0];
}

// Level thresholds based on total weight lifted (kg)
const LEVEL_THRESHOLDS = [0, 500, 1500, 3000, 5000, 8000, 12000, 18000, 30000, 50000];

export function getLevel(totalWeight: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalWeight >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, 10);
}

export function getLevelImage(avatarId: number, level: number): string | null {
  const avatar = getAvatar(avatarId);
  if (!avatar.levelImages) return null;
  const idx = Math.max(0, Math.min(level - 1, avatar.levelImages.length - 1));
  return avatar.levelImages[idx];
}

export function getRankTier(totalWeight: number): 'bronze' | 'silver' | 'gold' {
  if (totalWeight >= 50000) return 'gold';
  if (totalWeight >= 20000) return 'silver';
  return 'bronze';
}

export function getRankLabel(tier: 'bronze' | 'silver' | 'gold'): string {
  switch (tier) {
    case 'gold': return '🥇 Ouro';
    case 'silver': return '🥈 Prata';
    case 'bronze': return '🥉 Bronze';
  }
}
