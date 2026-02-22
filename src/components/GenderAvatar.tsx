import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** Simple male silhouette SVG (data URI) */
const MALE_ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="18" r="10" fill="#4a90d9"/><path d="M16 56c0-12 7-20 16-20s16 8 16 20" fill="#4a90d9"/></svg>`)}`;

/** Simple female silhouette SVG (data URI) */
const FEMALE_ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="18" r="10" fill="#d94a8a"/><path d="M16 56c0-12 7-20 16-20s16 8 16 20" fill="#d94a8a"/><path d="M24 16c0-6 4-12 8-12s8 6 8 12" fill="none" stroke="#d94a8a" stroke-width="2"/></svg>`)}`;

/** Neutral person silhouette SVG (data URI) */
const NEUTRAL_ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="18" r="10" fill="#999"/><path d="M16 56c0-12 7-20 16-20s16 8 16 20" fill="#999"/></svg>`)}`;

export function getGenderIcon(gender?: string | null): string {
  switch (gender?.toLowerCase()) {
    case "male":
      return MALE_ICON;
    case "female":
      return FEMALE_ICON;
    default:
      return NEUTRAL_ICON;
  }
}

export function getGenderColor(gender?: string | null): string {
  switch (gender?.toLowerCase()) {
    case "male":
      return "bg-blue-100";
    case "female":
      return "bg-pink-100";
    default:
      return "bg-secondary";
  }
}

interface GenderAvatarProps {
  avatarUrl?: string | null;
  gender?: string | null;
  fallbackInitials: string;
  className?: string;
}

export function GenderAvatar({ avatarUrl, gender, fallbackInitials, className = "h-12 w-12" }: GenderAvatarProps) {
  const src = avatarUrl || getGenderIcon(gender);
  const bgColor = getGenderColor(gender);

  return (
    <Avatar className={className}>
      <AvatarImage src={src} />
      <AvatarFallback className={`${bgColor} text-xs`}>
        {fallbackInitials}
      </AvatarFallback>
    </Avatar>
  );
}
