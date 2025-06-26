// User-related interfaces
export interface User {
  id: number;
  username: string;
  email: string;
  city?: string;
  zipCode?: string;
  street?: string;
  houseNumber?: string;
  mobile?: string;
}

export interface UserDTO {
  id: number;
  username: string;
  email: string;
}

export interface UserRegisterDTO {
  username: string;
  email: string;
  password: string;
  city?: string;
  zipCode?: string;
  street?: string;
  houseNumber?: string;
  mobile?: string;
}

export interface UserLoginDTO {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

// API Error interface
export interface ApiError {
  path: string;
  message: string;
  statusCode: number;
  statusName: string;
  timestamp: string;
  errorType: string;
}

// Authentication state
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}
