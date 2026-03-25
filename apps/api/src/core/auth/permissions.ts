export const PERMISSIONS = {
  USERS_MANAGE: ["Admin", "RRHH"],
  MENU_MANAGE: ["Admin", "Nutricion"],
  REPORTS_VIEW: ["Admin", "Nutricion"],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;