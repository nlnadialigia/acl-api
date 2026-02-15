import {
  Cat,
  Dog,
  Mountain,
  Zap,
  Rocket,
  Bird,
  Waves,
  Shield,
  type LucideProps,
} from "lucide-react"
import type { ComponentType } from "react"

const iconMap: Record<string, ComponentType<LucideProps>> = {
  Cat,
  Dog,
  Mountain,
  Zap,
  Rocket,
  Bird,
  Waves,
  Shield,
}

export function getPluginIcon(iconName: string): ComponentType<LucideProps> {
  return iconMap[iconName] || Shield
}
