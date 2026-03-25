export type UserRole = "Admin" | "User" | "Nutricion" | "RRHH";

export type UserStatusFilter = "active" | "inactive" | "all";

export type ListUsersParams = {
  q?: string;
  unidad_id?: number | null;
  status?: UserStatusFilter;
  limit: number;
  offset: number;
};

export type UserListItem = {
  id: number;
  rut: string | null;
  nombre: string;
  unidad_id: number | null;
  unidad_nombre?: string | null;
  email: string | null;
  username?: string | null;
  rol: string;
  is_active: number;
  created_at: string | null;
};

export type CreateUserInput = {
  rut: string;
  nombre: string;
  unidad?: number | null;
  email?: string | null;
  username?: string | null;
  rol?: string;
  password?: string;
};

export type InsertUserInput = {
  rut: string;
  nombre: string;
  unidad?: number | null;
  email?: string | null;
  username?: string | null;
  rol?: string;
};

export type UpdateUserInput = {
  unidad?: number | null;
  email?: string | null;
  username?: string | null;
  rol?: string;
  is_active?: number;
  password?: string;
};