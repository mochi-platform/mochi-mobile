import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from "react-native-purchases";
import { isExpoGo } from "@/lib/env";
import { supabase } from "@/src/shared/lib/supabase";

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
let purchasesModulePromise: Promise<typeof import("react-native-purchases")> | null = null;

export type RevenueCatPlan = {
  isPremium: boolean;
  status: string | null;
  productId: string | null;
  periodEndsAt: string | null;
};

export function canUseRevenueCat(): boolean {
  return Boolean(REVENUECAT_API_KEY) && !isExpoGo;
}

async function loadPurchasesModule(): Promise<typeof import("react-native-purchases") | null> {
  if (!canUseRevenueCat()) return null;

  purchasesModulePromise ??= import("react-native-purchases");
  return purchasesModulePromise;
}

let revenueCatConfigured = false;

/** Se configura una sola vez; después se enlaza el App User ID con logIn/logOut. */
export async function configureRevenueCat(userId: string | null): Promise<void> {
  const Purchases = await loadPurchasesModule();
  if (!Purchases) return;

  if (!revenueCatConfigured) {
    Purchases.default.setLogLevel(Purchases.LOG_LEVEL.WARN);
    Purchases.default.configure({
      apiKey: REVENUECAT_API_KEY as string,
      appUserID: userId ?? undefined,
    });
    revenueCatConfigured = true;
    return;
  }

  const current = await Purchases.default.getAppUserID();
  if (userId && current !== userId) {
    await Purchases.default.logIn(userId);
  } else if (!userId && !(await Purchases.default.isAnonymous())) {
    await Purchases.default.logOut();
  }
}

export async function getRevenueCatOfferings(): Promise<PurchasesOfferings | null> {
  const Purchases = await loadPurchasesModule();
  if (!Purchases) return null;
  return Purchases.default.getOfferings();
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo | null> {
  const Purchases = await loadPurchasesModule();
  if (!Purchases) return null;
  return Purchases.default.getCustomerInfo();
}

export async function purchaseRevenueCatPackage(selected: PurchasesPackage): Promise<CustomerInfo> {
  const Purchases = await loadPurchasesModule();
  if (!Purchases) {
    throw new Error("RevenueCat no esta disponible en este entorno.");
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user || (await Purchases.default.getAppUserID()) !== authData.user.id) {
    throw new Error(
      "No se pudo vincular tu cuenta con la tienda. Cierra sesión y vuelve a entrar.",
    );
  }

  const { customerInfo } = await Purchases.default.purchasePackage(selected);
  return customerInfo;
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
  const Purchases = await loadPurchasesModule();
  if (!Purchases) {
    throw new Error("RevenueCat no esta disponible en este entorno.");
  }

  return Purchases.default.restorePurchases();
}

/** El webhook de RevenueCat escribe la suscripción; aquí solo se lee el plan del servidor. */
export async function syncRevenueCatToBackend(customerInfo: CustomerInfo): Promise<RevenueCatPlan> {
  const entitlement = customerInfo.entitlements.active?.premium ?? null;

  let planData: {
    plan_key?: string;
    status?: string;
    current_period_ends_at?: string | null;
  } = {};
  // El webhook puede tardar unos segundos tras la compra.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase.rpc("get_user_plan");
    if (error) throw error;
    planData = (data ?? {}) as typeof planData;
    if (planData.plan_key === "premium" || !entitlement) break;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return {
    isPremium: planData.plan_key === "premium",
    status: planData.status ?? null,
    productId: entitlement?.productIdentifier ?? null,
    periodEndsAt: planData.current_period_ends_at ?? null,
  };
}
