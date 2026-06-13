import {
  ArrowDownUp,
  ArrowRight,
  Award,
  BarChart3,
  Calculator,
  Calendar,
  Car,
  CarFront,
  Check,
  ChevronDown,
  CircleDot,
  Gauge,
  Info,
  LayoutGrid,
  Leaf,
  Lightbulb,
  Menu,
  Percent,
  PiggyBank,
  Plus,
  Printer,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

const MAP: Record<string, LucideIcon> = {
  "arrow-down-up": ArrowDownUp,
  "arrow-right": ArrowRight,
  award: Award,
  "bar-chart-3": BarChart3,
  calculator: Calculator,
  calendar: Calendar,
  car: Car,
  "car-front": CarFront,
  check: Check,
  "chevron-down": ChevronDown,
  "circle-dot": CircleDot,
  gauge: Gauge,
  info: Info,
  "layout-grid": LayoutGrid,
  leaf: Leaf,
  lightbulb: Lightbulb,
  menu: Menu,
  percent: Percent,
  "piggy-bank": PiggyBank,
  plus: Plus,
  printer: Printer,
  scale: Scale,
  search: Search,
  "sliders-horizontal": SlidersHorizontal,
  sparkles: Sparkles,
};

export default function Icon({
  name,
  size = 18,
  className,
  style,
  strokeWidth = 2,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  const Cmp = MAP[name];
  if (!Cmp) return null;
  return <Cmp size={size} className={className} style={style} strokeWidth={strokeWidth} aria-hidden="true" />;
}
