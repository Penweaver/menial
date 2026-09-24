/**
 * Menial Mobile - Encrypted Token & Session Storage
 * 
 * Uses hardware-backed encrypted storage (expo-secure-store) for iOS Keychain
 * and Android EncryptedSharedPreferences.
 * Plaintext AsyncStorage is strictly banned for credentials per security mandates.
 */

// Safe require for expo-secure-store so StorageService runs in Expo and headless test environments
let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}
import type { PhoneAuthSession } from '@shared/services/auth/AuthService';
import type { UserAccountType } from '@shared/types/enums';

const KEYS = {
  AUTH_SESSION: 'menial_auth_session',
  ACTIVE_ROLE: 'menial_active_role',
  ONBOARDING_COMPLETED: 'menial_onboarding_completed',
} as const;

// In-memory fallback for test runners / environments where native secure store is unavailable
const memoryFallback = new Map<string, string>();

async function getSecureStore(): Promise<typeof import('expo-secure-store') | null> {
  if (!SecureStore) return null;
  try {
    const available = await SecureStore.isAvailableAsync();
    return available ? SecureStore : null;
  } catch {
    return null;
  }
}

export const StorageService = {
  /**
   * Encrypts and persists the PhoneAuthSession.
   */
  async saveAuthSession(session: PhoneAuthSession): Promise<void> {
    const raw = JSON.stringify(session);
    const store = await getSecureStore();
    if (store) {
      await store.setItemAsync(KEYS.AUTH_SESSION, raw, {
        keychainAccessible: store.AFTER_FIRST_UNLOCK,
      });
    } else {
      memoryFallback.set(KEYS.AUTH_SESSION, raw);
    }
  },

  /**
   * Retrieves and decrypts the persisted PhoneAuthSession.
   */
  async getAuthSession(): Promise<PhoneAuthSession | null> {
    try {
      let raw: string | null = null;
      const store = await getSecureStore();
      if (store) {
        raw = await store.getItemAsync(KEYS.AUTH_SESSION);
      } else {
        raw = memoryFallback.get(KEYS.AUTH_SESSION) || null;
      }
      if (!raw) return null;
      return JSON.parse(raw) as PhoneAuthSession;
    } catch {
      return null;
    }
  },

  /**
   * Securely wipes the auth session from encrypted storage.
   */
  async clearAuthSession(): Promise<void> {
    const store = await getSecureStore();
    if (store) {
      await store.deleteItemAsync(KEYS.AUTH_SESSION);
    } else {
      memoryFallback.delete(KEYS.AUTH_SESSION);
    }
  },

  /**
   * Persists active user role ('employer' | 'worker').
   */
  async saveActiveRole(role: UserAccountType): Promise<void> {
    const store = await getSecureStore();
    if (store) {
      await store.setItemAsync(KEYS.ACTIVE_ROLE, role);
    } else {
      memoryFallback.set(KEYS.ACTIVE_ROLE, role);
    }
  },

  /**
   * Retrieves active user role.
   */
  async getActiveRole(): Promise<UserAccountType | null> {
    try {
      const store = await getSecureStore();
      if (store) {
        const role = await store.getItemAsync(KEYS.ACTIVE_ROLE);
        return (role as UserAccountType) || null;
      } else {
        return (memoryFallback.get(KEYS.ACTIVE_ROLE) as UserAccountType) || null;
      }
    } catch {
      return null;
    }
  },

  /**
   * Clears active user role.
   */
  async clearActiveRole(): Promise<void> {
    const store = await getSecureStore();
    if (store) {
      await store.deleteItemAsync(KEYS.ACTIVE_ROLE);
    } else {
      memoryFallback.delete(KEYS.ACTIVE_ROLE);
    }
  },
};
