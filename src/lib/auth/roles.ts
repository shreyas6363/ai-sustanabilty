import { UserRole } from "@/types";

export function canManageUsers(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canManageSettings(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canWriteResourceData(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function canManageRecommendations(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function canViewData(_role: UserRole): boolean {
  return true;
}
