import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/src/core/providers/SessionContext";

const DAY = 24 * 60 * 60 * 1000;

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "mochi:query-cache" });

/** Caché persistente para lecturas: la app abre con lo último visto aunque no haya red. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, gcTime: DAY, retry: 1 } },
      }),
  );

  // La caché es de una sola persona: al cambiar de cuenta o cerrar sesión se vacía.
  useEffect(() => {
    return () => client.clear();
  }, [client, userId]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: DAY, buster: userId ?? "anon" }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
