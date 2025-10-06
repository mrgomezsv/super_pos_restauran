export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'manager';
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
