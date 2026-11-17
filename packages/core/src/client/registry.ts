import type { ComponentType, LazyExoticComponent } from "react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "../shared";

export interface ModuleDefinition {
  id: string;
  path: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  mobileIcon?: LucideIcon;
  roles?: Role[];
  mobile?: boolean;
  Component: LazyExoticComponent<ComponentType>;
}

const registered = new Map<string, ModuleDefinition>();

export function registerModule(def: ModuleDefinition): void {
  if (!registered.has(def.id)) {
    registered.set(def.id, def);
  }
}

export function getModules(): ModuleDefinition[] {
  return Array.from(registered.values());
}

export function getModuleByPath(path: string): ModuleDefinition | undefined {
  return getModules().find((m) => m.path === path);
}

export function clearModules(): void {
  registered.clear();
}