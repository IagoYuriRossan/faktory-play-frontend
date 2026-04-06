import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../../@types';
import { auth, db } from '../../utils/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthReady: boolean;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthReady: false,
      login: (user, token) => set({ user, token }),
      logout: async () => {
        await signOut(auth);
        set({ user: null, token: null });
      },
      initialize: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              set({ user: userData, token, isAuthReady: true });
            } else {
              set({ user: null, token: null, isAuthReady: true });
            }
          } else {
            set({ user: null, token: null, isAuthReady: true });
          }
        });

        return unsubscribe;
      },
    }),
    {
      name: 'faktory-play-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
