import { create } from 'zustand';
import { User } from '@common/interfaces/user';
import { Admin, emptyUser } from '@common/services/user-service';

interface UserState {
  user: User;
  avatar: string;
  administrators: Admin[];
}

interface UserActions {
  setUser: (user: User) => void;
  setAvatar: (avatar: string) => void;
  setAdministrators: (admins: Admin[]) => void;
  reset: () => void;
}

type UserStore = UserState & UserActions;

const initialState: UserState = {
  user: emptyUser,
  avatar: '',
  administrators: [],
};

export const useUserStore = create<UserStore>((set) => ({
  ...initialState,
  setUser: (user) => set({ user }),
  setAvatar: (avatar) => set({ avatar }),
  setAdministrators: (administrators) => set({ administrators }),
  reset: () => set(initialState),
}));
