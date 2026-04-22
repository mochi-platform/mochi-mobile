import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { isExpoGo } from "@/lib/env";
import { supabase } from "@/src/shared/lib/supabase";

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();
let purchasesModulePromise:
  | Promise<typeof import("react-native-purchases")>
  | null = null;

export type RevenueCatPlan = {
  isPremium: boolean;
  status: string | null;
  productId: string | null;
  periodEndsAt: string | null;
};

export function canUseRevenueCat(): boolean {
  return Boolean(REVENUECAT_API_KEY) && !isExpoGo;
}

async function loadPurchasesModule(): Promise<
  typeof import("react-native-purchases") | null
> {
  if (!canUseRevenueCat()) return null;

  purchasesModulePromise ??= import("react-native-purchases");
  return purchasesModulePromise;
}

export async function configureRevenueCat(userId: string | null): Promise<void> {
  const Purchases = await loadPurchasesModule();
  if (!Purchases) return;

  Purchases.default.setLogLevel(Purchases.LOG_LEVEL.WARN);
  Purchases.default.configure({
    apiKey: REVENUECAT_API_KEY as string,
    appUserID: userId ?? undefined,
  });
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

export async function purchaseRevenueCatPackage(
  selected: PurchasesPackage,
): Promise<CustomerInfo> {
  const Purchases = await loadPurchasesModule();
  if (!Purchases) {
    throw new Error("RevenueCat no esta disponible en este entorno.");
  }

  return Purchases.default.purchasePackage(selected);
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
  const Purchases = await loadPurchasesModule();
  if (!Purchases) {
    throw new Error("RevenueCat no esta disponible en este entorno.");
  }

  return Purchases.default.restorePurchases();
}

export async function syncRevenueCatToBackend(
  customerInfo: CustomerInfo,
): Promise<RevenueCatPlan> {
  const entitlement = customerInfo.entitlements.active?.premium ?? null;
  const isPremium = Boolean(entitlement);

  const payload = {
    p_entitlement_id: "premium",
    p_product_id: entitlement?.productIdentifier ?? null,
    p_status: isPremium ? "active" : "expired",
    p_current_period_started_at: entitlement?.latestPurchaseDate ?? null,
    p_current_period_ends_at: entitlement?.expirationDate ?? null,
    p_auto_renew: entitlement?.willRenew ?? false,
    p_store: entitlement?.store ?? "google_play",
    p_external_customer_id: customerInfo.originalAppUserId ?? null,
    p_event_id: entitlement?.identifier ?? null,
    p_event_type: "sync",
    p_payload: customerInfo,
    p_provider: "revenuecat",
  };

  const { data, error } = await supabase.rpc(
    "sync_subscription_from_revenuecat",
    payload,
  );

  if (error) throw error;

  const planData = (data ?? {}) as {
    plan_key?: string;
    status?: string;
    current_period_ends_at?: string | null;
  };

  return {
    isPremium: planData.plan_key === "premium",
    status: planData.status ?? null,
    productId: entitlement?.productIdentifier ?? null,
    periodEndsAt: planData.current_period_ends_at ?? null,
  };
}
