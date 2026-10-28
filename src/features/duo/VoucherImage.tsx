import { useEffect, useState } from "react";
import { Image } from "react-native";
import { supabase } from "@/src/shared/lib/supabase";

/** Imagen de un vale (bucket privado): se pide una URL firmada de corta duración. */
export function VoucherImage({ path }: { path: string | null | undefined }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let active = true;
    void supabase.storage
      .from("voucher-images")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) return null;
  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel="Imagen del vale"
      className="mt-2 h-32 w-full rounded-control"
      resizeMode="cover"
    />
  );
}

export default VoucherImage;
