import { ApiResponse, apiService } from './api-service';

const data = {
  email: 'karin.andersson@example.com',
  password: 'password',
};

interface LoginResponse {
  id: number;
  name: string;
  email: string;
  password: string;
  guid: string;
}

// TODO change to proper validation when login flow works
const isValidLogin: (res: ApiResponse<LoginResponse>) => boolean = (res) => !!res?.data?.name;

export const login: () => Promise<boolean> = () =>
  apiService
    .post<ApiResponse<LoginResponse>, { email: string; password: string }>('login', data)
    .then((res) => isValidLogin(res.data));
