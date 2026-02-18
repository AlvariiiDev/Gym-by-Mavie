import { getAvatar, getLevelImage } from "@/lib/avatars";

interface AvatarDisplayProps {
  avatarId: number;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  level?: number;
}

const sizeClasses = {
  sm: "w-10 h-10 text-xl",
  md: "w-14 h-14 text-2xl",
  lg: "w-20 h-20 text-4xl",
};

export default function AvatarDisplay({ avatarId, size = "md", showName = false, level = 1 }: AvatarDisplayProps) {
  const avatar = getAvatar(avatarId);
  const levelImage = getLevelImage(avatarId, level);

  return (
    <div className="flex flex-col items-center gap-1">
      {levelImage ? (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden neon-box`}>
          <img src={levelImage} alt={avatar.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${avatar.color} flex items-center justify-center neon-box`}>
          <span>{avatar.emoji}</span>
        </div>
      )}
      {showName && (
        <span className="text-xs text-muted-foreground font-medium">
          {avatar.name} {levelImage && <span className="text-primary">Lv.{level}</span>}
        </span>
      )}
    </div>
  );
}
