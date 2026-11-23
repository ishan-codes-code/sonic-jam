import * as SecureStore from 'expo-secure-store';
import { getSessionGeneration } from '@/features/server/utils/sessionGeneration';

const ACCESS_TOKEN_KEY = 'sonic_access_token';
const REFRESH_TOKEN_KEY = 'sonic_refresh_token';

// --------------------------------------------------------------------------
// Serialized token mutations.
//
// Every mutation below runs inside ONE promise chain, in dispatch order, each
// awaiting full native completion before the next dispatches. Together with
// the rule that newer-session writes are only ever dispatched after the
// switch that created them, this gives a total order: an op dispatched before
// a server switch always lands before anything the new session writes, so a
// stale op can never overwrite or delete the new session's credentials — no
// matter how the native bridge schedules the individual calls.
//
// Reads stay unserialized. No mutation ever awaits another token mutation,
// so the chain cannot deadlock. Callers keep their existing signatures.
// --------------------------------------------------------------------------

let mutationChain: Promise<void> = Promise.resolve();

function serializeMutation<T>(op: () => Promise<T>): Promise<T> {
  const run = mutationChain.then(op, op);
  // The chain itself never rejects, so one failed op cannot wedge later ones.
  mutationChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function saveTokensOp(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

async function clearTokensOp(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export const tokenStorage = {
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    return serializeMutation(() => saveTokensOp(accessToken, refreshToken));
  },

  /**
   * Save tokens only if `generation` is still current, checked INSIDE the
   * serialized critical section with no await between the check and the
   * dispatch — a server switch cannot land between them. Returns false
   * (writing nothing) when stale. Refresh paths must use this instead of
   * saveTokens; the boolean replaces the old write-then-undo pattern, whose
   * undo cleanup could wipe a newer session's credentials.
   */
  async saveTokensIfCurrent(
    accessToken: string,
    refreshToken: string,
    generation: number,
  ): Promise<boolean> {
    return serializeMutation(async () => {
      if (generation !== getSessionGeneration()) {
        return false;
      }
      await saveTokensOp(accessToken, refreshToken);
      return true;
    });
  },

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async updateAccessToken(accessToken: string): Promise<void> {
    return serializeMutation(() =>
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    );
  },

  async clearTokens(): Promise<void> {
    return serializeMutation(clearTokensOp);
  },
};
