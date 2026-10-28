import AsyncStorage from "@react-native-async-storage/async-storage";

export const DRAFT_PREFIX = "onboarding:draft:v1:";
export const draftKey = (userId: string) => `${DRAFT_PREFIX}${userId}`;

/** Borra el borrador de una usuaria, o el de todas si no se indica (cierre de sesión). */
export async function clearOnboardingDraft(userId?: string): Promise<void> {
  try {
    if (userId) {
      await AsyncStorage.removeItem(draftKey(userId));
      return;
    }
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(DRAFT_PREFIX));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  } catch {
    // El borrador es una comodidad; si no se puede borrar, no se bloquea nada.
  }
}
