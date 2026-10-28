import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, Caption, Chip, Input, Sheet } from "@/src/shared/ui";
import { reportError } from "@/src/shared/lib/observability/reportError";
import { supabase } from "@/src/shared/lib/supabase";
import { notifyVoucherGift } from "@/src/features/duo/push";

type Template = {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  icon: string;
  color: string;
};
type VoucherMode = "points" | "gift";

type Props = {
  visible: boolean;
  spaceId: string;
  onClose: () => void;
  onCreated: () => void;
};

/** La pareja crea un vale para ella: por puntos (ella los canjea) o regalo directo. */
export function PartnerVoucherModal({ visible, spaceId, onClose, onCreated }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<VoucherMode>("points");
  const [cost, setCost] = useState("50");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    void supabase
      .from("voucher_templates")
      .select("id, title, description, points_cost, icon, color")
      .order("points_cost", { ascending: true })
      .then(({ data }) => setTemplates((data as Template[] | null) ?? []));
  }, [visible]);

  const applyTemplate = (t: Template) => {
    setTemplateId(t.id);
    setTitle(t.title);
    setDescription(t.description ?? "");
    setCost(String(t.points_cost));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageUri) return null;
    const bytes = await (await fetch(imageUri)).arrayBuffer();
    const path = `${spaceId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("voucher-images")
      .upload(path, bytes, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;
    return path;
  };

  const submit = async () => {
    setError(null);
    const points = Number(cost);
    if (title.trim().length === 0) {
      setError("Escribe un título para el vale.");
      return;
    }
    if (mode === "points" && (!Number.isInteger(points) || points < 1 || points > 1000)) {
      setError("El costo debe ser un número entre 1 y 1000.");
      return;
    }
    setSaving(true);
    try {
      const imagePath = await uploadImage();
      const { data: voucherId, error: rpcError } = await supabase.rpc("create_partner_voucher", {
        p_space_id: spaceId,
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_points_cost: mode === "gift" ? 0 : points,
        p_icon: templates.find((t) => t.id === templateId)?.icon ?? "ticket-outline",
        p_color: templates.find((t) => t.id === templateId)?.color ?? "yellow",
        p_mode: mode,
        p_image_url: imagePath,
        p_template_id: templateId,
      });
      if (rpcError) throw rpcError;
      if (typeof voucherId === "string") void notifyVoucherGift(voucherId);
      setTitle("");
      setDescription("");
      setTemplateId(null);
      setImageUri(null);
      onCreated();
      onClose();
    } catch (err) {
      reportError(err, { scope: "duo/create-voucher" });
      setError(err instanceof Error ? err.message : "No se pudo crear el vale.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Un vale para ella">
      {templates.length > 0 ? (
        <>
          <Text className="mb-2 ml-1 font-body-bold text-sm text-ink">Ideas para empezar</Text>
          <View className="flex-row flex-wrap gap-2">
            {templates.map((t) => (
              <Chip
                key={t.id}
                label={t.title}
                selected={templateId === t.id}
                onPress={() => applyTemplate(t)}
              />
            ))}
          </View>
        </>
      ) : null}

      <View className="mt-4">
        <Input label="Título" value={title} onChangeText={setTitle} maxLength={80} />
        <Input
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </View>

      <Text className="mb-2 ml-1 font-body-bold text-sm text-ink">¿Cómo se canjea?</Text>
      <View className="flex-row gap-2">
        <Chip label="Por puntos" selected={mode === "points"} onPress={() => setMode("points")} />
        <Chip label="Regalo directo" selected={mode === "gift"} onPress={() => setMode("gift")} />
      </View>
      {mode === "points" ? (
        <View className="mt-3">
          <Input
            label="Costo en puntos"
            keyboardType="number-pad"
            value={cost}
            onChangeText={setCost}
          />
        </View>
      ) : (
        <Caption className="ml-1 mt-2">Ella lo canjea gratis cuando quiera.</Caption>
      )}

      <View className="mt-3">
        <Button
          title={imageUri ? "Cambiar imagen" : "Agregar imagen (Duo Plus)"}
          variant="soft"
          onPress={() => void pickImage()}
        />
      </View>

      {error ? <Text className="ml-1 mt-3 font-body-bold text-sm text-danger">{error}</Text> : null}

      <View className="mt-5 gap-2">
        <Button title="Crear vale" loading={saving} onPress={() => void submit()} />
        <Button title="Cancelar" variant="outline" onPress={onClose} />
      </View>
    </Sheet>
  );
}

export default PartnerVoucherModal;
