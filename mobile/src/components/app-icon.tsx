import type { LucideIcon } from "lucide-react-native";
import {
  Banknote,
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  Coins,
  CreditCard,
  Ellipsis,
  FileText,
  FileUser,
  House,
  Layers3,
  LayoutGrid,
  ReceiptText,
  School,
  ShieldCheck,
  TrendingUp,
  Users,
  UserRound,
  CarFront,
  ClipboardList,
  Wallet,
} from "lucide-react-native";

const ICONS: Record<string, LucideIcon> = {
  home: House,
  users: Users,
  user: UserRound,
  calendar: CalendarDays,
  car: CarFront,
  clock: Clock3,
  book: BookOpen,
  banknote: Banknote,
  wallet: Wallet,
  coins: Coins,
  receipt: ReceiptText,
  bot: Bot,
  "bar-chart": BarChart3,
  briefcase: BriefcaseBusiness,
  building: Building2,
  school: School,
  "credit-card": CreditCard,
  "file-text": FileText,
  shield: ShieldCheck,
  "file-user": FileUser,
  "trending-up": TrendingUp,
  layers: Layers3,
  grid: LayoutGrid,
  clipboard: ClipboardList,
  more: Ellipsis,
};

export function AppIcon({
  name,
  color,
  size = 20,
  strokeWidth = 2.1,
}: {
  name: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = ICONS[name] || LayoutGrid;
  return <Icon color={color} size={size} strokeWidth={strokeWidth} />;
}
