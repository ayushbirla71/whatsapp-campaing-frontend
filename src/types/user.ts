export interface User {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'super_admin' | 'system_admin' | 'organization_admin' | 'user';
  organization_id?: string;
  organization?: {
    _id: string;
    name: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'system_admin' | 'organization_admin' | 'user';
  organization_id?: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: 'super_admin' | 'system_admin' | 'organization_admin' | 'user';
  organization_id?: string;
  is_active?: boolean;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    limit: number;
  };
}
