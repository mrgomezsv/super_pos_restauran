export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'sudo' | 'admin' | 'cashier' | 'manager';
  company_id?: number;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresIn: number;
}
