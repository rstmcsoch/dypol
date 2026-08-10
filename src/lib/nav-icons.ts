import {
  Home, BookOpen, LayoutGrid, LifeBuoy, User, Shield, Sparkles, Bookmark,
  Star, Heart, Rocket, GraduationCap, Compass, MessageCircle, Link as LinkIcon,
  Newspaper, Trophy, Flame, Zap, Target, Calendar, Music, Video, Camera,
  Globe, Mail, Phone, Gift, Coffee, Feather, Layers,
  type LucideIcon,
} from "lucide-react";

export const NAV_ICONS: Record<string, LucideIcon> = {
  Home, BookOpen, LayoutGrid, LifeBuoy, User, Shield, Sparkles, Bookmark,
  Star, Heart, Rocket, GraduationCap, Compass, MessageCircle, Link: LinkIcon,
  Newspaper, Trophy, Flame, Zap, Target, Calendar, Music, Video, Camera,
  Globe, Mail, Phone, Gift, Coffee, Feather, Layers,
};

export const NAV_ICON_NAMES = Object.keys(NAV_ICONS);

export function getNavIcon(name: string | null | undefined): LucideIcon {
  return (name && NAV_ICONS[name]) || Sparkles;
}
