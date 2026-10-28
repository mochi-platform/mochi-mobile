import { useSession } from "@/src/core/providers/SessionContext";
import { OnboardingScreen } from "@/src/features/onboarding/OnboardingScreen";

/** Montada por usuaria: un cambio de cuenta nunca reutiliza el estado ni el borrador de la anterior. */
export default function OnboardingRoute() {
  const { session } = useSession();
  return <OnboardingScreen key={session?.user.id ?? "anon"} />;
}
