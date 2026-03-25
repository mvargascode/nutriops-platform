export const ROLES = {
  ADMIN: "Admin",
  JEFATURA: "Jefatura",
  NUTRICION: "Nutricion",
  RRHH: "RRHH",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];
