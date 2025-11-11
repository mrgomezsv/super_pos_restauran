export type UserRole = 'sudo' | 'admin' | 'cashier' | 'manager';

export interface UserCompany {
  id: string;
  nombre: string;
  razonSocial?: string;
  nit?: string;
  estado?: string;
  subscriptionPlan?: string;
  maxUsers?: number;
  maxProducts?: number;
  maxSalesPerMonth?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  isActive?: boolean;
  phone?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  primaryCompanyId?: string;
  companies: UserCompany[];
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}
