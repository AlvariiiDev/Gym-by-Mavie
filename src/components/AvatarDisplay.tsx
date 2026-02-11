import { getAvatar } from "@/lib/avatars";

interface AvatarDisplayProps {
  avatarId: number;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

const sizeClasses = {
  sm: "w-10 h-10 text-xl",
  md: "w-14 h-14 text-2xl",
  lg: "w-20 h-20 text-4xl",
};

export default function AvatarDisplay({ avatarId, size = "md", showName = false }: AvatarDisplayProps) {
  const avatar = getAvatar(avatarId);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center neon-box`}>
        <span>{avatar.emoji}</span>
      </div>
      {showName && <span className="text-xs text-muted-foreground font-medium">{avatar.name}</span>}
    </div>
  );
}
