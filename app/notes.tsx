import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { FloatingActionButton } from "@/src/shared/components/FloatingActionButton";
import type { QuickNote } from "@/src/shared/types/database";

const colorMap: Record<QuickNote["color"], { card: string; dot: string }> = {
  yellow: { card: "bg-yellow-100 border-yellow-200", dot: "#eab308" },
  pink: { card: "bg-pink-100 border-pink-200", dot: "#ec4899" },
  blue: { card: "bg-blue-100 border-blue-200", dot: "#3b82f6" },
  teal: { card: "bg-teal-100 border-teal-200", dot: "#14b8a6" },
  purple: { card: "bg-purple-100 border-purple-200", dot: "#a855f7" },
};

export function NotesScreen() {
  const { session } = useSession();
  const userId = session?.user.id;

  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editorVisible, setEditorVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [activeNote, setActiveNote] = useState<QuickNote | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<QuickNote["color"]>("yellow");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const orderedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          Number(b.is_pinned) - Number(a.is_pinned) ||
          b.updated_at.localeCompare(a.updated_at),
      ),
    [notes],
  );

  const loadNotes = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("quick_notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .returns<QuickNote[]>();

    if (fetchError) {
      setError(fetchError.message);
      setNotes([]);
    } else {
      setNotes(data ?? []);
    }

    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadNotes();
    }, [loadNotes]),
  );

  const flushSave = async () => {
    if (!activeNote || !userId || !content.trim()) return;

    const payload = {
      id: activeNote.id,
      user_id: userId,
      title: title.trim() || null,
      content: content.trim(),
      color,
      is_pinned: activeNote.is_pinned,
      updated_at: new Date().toISOString(),
    };

    const { data } = await supabase
      .from("quick_notes")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single<QuickNote>();

    if (data) {
      setNotes((prev) =>
        prev.map((item) => (item.id === data.id ? data : item)),
      );
      setActiveNote(data);
    }
  };

  const queueSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, 800);
  };

  const openCreate = async () => {
    if (!userId) return;

    const { data, error: createError } = await supabase
      .from("quick_notes")
      .insert({
        user_id: userId,
        title: null,
        content: " ",
        color: "yellow",
        is_pinned: false,
      })
      .select("*")
      .single<QuickNote>();

    if (createError || !data) {
      setError(createError?.message ?? "No se pudo crear la nota");
      return;
    }

    setNotes((prev) => [data, ...prev]);
    setActiveNote(data);
    setTitle(data.title ?? "");
    setContent(data.content.trim());
    setColor(data.color);
    setEditorVisible(true);
  };

  const openEdit = (note: QuickNote) => {
    setActiveNote(note);
    setTitle(note.title ?? "");
    setContent(note.content);
    setColor(note.color);
    setEditorVisible(true);
  };

  const togglePin = async () => {
    if (!activeNote || !userId) return;

    const { data } = await supabase
      .from("quick_notes")
      .update({
        is_pinned: !activeNote.is_pinned,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeNote.id)
      .eq("user_id", userId)
      .select("*")
      .single<QuickNote>();

    if (data) {
      setNotes((prev) =>
        prev.map((note) => (note.id === data.id ? data : note)),
      );
      setActiveNote(data);
    }

    setOptionsVisible(false);
  };

  const changeColor = async (nextColor: QuickNote["color"]) => {
    setColor(nextColor);
    queueSave();
  };

  const deleteNote = async () => {
    if (!activeNote || !userId) return;

    await supabase
      .from("quick_notes")
      .delete()
      .eq("id", activeNote.id)
      .eq("user_id", userId);
    setNotes((prev) => prev.filter((item) => item.id !== activeNote.id));
    setOptionsVisible(false);
    setEditorVisible(false);
    setActiveNote(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-yellow-50">
      <View className="flex-1 px-5">
        <ScrollView
          className="mt-0 flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 48 }}
        >
          <View className="mb-5 flex-row items-center">
            <Ionicons name="document-text" size={20} color="#854d0e" />
            <Text className="ml-2 text-2xl font-extrabold text-yellow-900">
              Notas rápidas
            </Text>
          </View>

          <Text className="text-sm font-semibold text-yellow-700">
            Ideas, pendientes y recordatorios en un solo lugar
          </Text>

          {loading ? (
            <Text className="mt-4 text-sm font-semibold text-yellow-700">
              Cargando notas...
            </Text>
          ) : null}
          {error ? (
            <Text className="mt-4 text-sm font-semibold text-red-600">
              {error}
            </Text>
          ) : null}

          <View className="mt-4 flex-row flex-wrap justify-between">
            {orderedNotes.map((note) => (
              <TouchableOpacity
                key={note.id}
                className={`mb-3 w-[48%] rounded-2xl border p-3 ${colorMap[note.color].card}`}
                onPress={() => openEdit(note)}
                onLongPress={() => {
                  setActiveNote(note);
                  setTitle(note.title ?? "");
                  setContent(note.content);
                  setColor(note.color);
                  setOptionsVisible(true);
                }}
              >
                <View className="flex-row items-start justify-between">
                  <Text
                    className="flex-1 text-sm font-bold text-slate-900"
                    numberOfLines={1}
                  >
                    {note.title || "Sin título"}
                  </Text>
                  {note.is_pinned ? (
                    <Ionicons name="pin" size={14} color="#7e22ce" />
                  ) : null}
                </View>
                <Text
                  className="mt-2 text-xs font-semibold text-slate-700"
                  numberOfLines={3}
                >
                  {note.content.trim()}
                </Text>
                <View
                  className="mt-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: colorMap[note.color].dot }}
                />
              </TouchableOpacity>
            ))}
          </View>
          <View className="h-24" />
        </ScrollView>
      </View>

      <FloatingActionButton
        onPress={() => {
          void openCreate();
        }}
        containerClassName="bg-yellow-500"
        accessibilityLabel="Crear nota rápida"
      />

      <Modal visible={editorVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/25">
          <View className="rounded-t-3xl bg-white p-4">
            <TextInput
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                queueSave();
              }}
              placeholder="Título (opcional)"
              className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-semibold"
            />
            <TextInput
              value={content}
              onChangeText={(value) => {
                setContent(value);
                queueSave();
              }}
              placeholder="Escribe tu nota"
              multiline
              autoFocus
              className="mt-3 min-h-40 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-3 text-sm font-semibold"
              style={{ textAlignVertical: "top" }}
            />
            <View className="mt-3 flex-row items-center">
              {(["yellow", "pink", "blue", "teal", "purple"] as const).map(
                (option) => (
                  <TouchableOpacity
                    key={option}
                    className={`mr-2 h-7 w-7 rounded-full ${color === option ? "border-2 border-slate-800" : ""}`}
                    style={{ backgroundColor: colorMap[option].dot }}
                    onPress={() => {
                      void changeColor(option);
                    }}
                  />
                ),
              )}
            </View>

            <TouchableOpacity
              className="mt-4 items-center rounded-xl bg-yellow-500 py-3"
              onPress={() => {
                void flushSave();
                setEditorVisible(false);
              }}
            >
              <Text className="font-bold text-white">Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={optionsVisible} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/25 px-6">
          <View className="w-full rounded-2xl bg-white p-4">
            <TouchableOpacity
              className="rounded-xl bg-violet-100 px-3 py-3"
              onPress={() => {
                void togglePin();
              }}
            >
              <Text className="text-center text-sm font-bold text-violet-800">
                {activeNote?.is_pinned ? "Desfijar" : "Fijar"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="mt-2 rounded-xl bg-red-100 px-3 py-3"
              onPress={() => {
                void deleteNote();
              }}
            >
              <Text className="text-center text-sm font-bold text-red-700">
                Eliminar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="mt-2 rounded-xl bg-slate-100 px-3 py-3"
              onPress={() => setOptionsVisible(false)}
            >
              <Text className="text-center text-sm font-bold text-slate-700">
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default NotesScreen;
