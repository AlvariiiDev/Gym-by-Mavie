export interface AvatarOption {
  id: number;
  name: string;
  emoji: string;
  color: string;
}

export const AVATARS: AvatarOption[] = [
  { id: 1, name: "Lutador Espetado", emoji: "🔥", color: "from-red-500 to-orange-500" },
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
