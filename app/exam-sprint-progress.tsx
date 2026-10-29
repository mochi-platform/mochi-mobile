import { toLocalISODate } from "@/src/shared/lib/dates";
import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSession } from "@/src/core/providers/SessionContext";
import { useExamSprints } from "@/src/shared/hooks/useExamSprints";
import { SprintTracker } from "@/src/shared/components/SprintTracker";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import {
  Button,
  Caption,
  DateField,
  IconTile,
  Input,
  ListGroup,
  ListRow,
  MochiBubble,
  Screen,
  SectionHeader,
  Sheet,
  Skeleton,
} from "@/src/shared/ui";

export function ExamSprintProgressScreen() {
  const { session } = useSession();
  const params = useLocalSearchParams<{ examId?: string; subject?: string }>();

  const examId = params.examId ?? "";
  const subject = params.subject ?? "Examen";

  const { sprints, createSprint, isLoading: sprintsLoading } = useExamSprints(session?.user.id);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dailyHours, setDailyHours] = useState("2");
  const [targetGrade, setTargetGrade] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get active sprint for this exam
  const activeSprint = sprints.find(
    (s) =>
      s.exam_id === examId &&
      new Date(s.start_date) <= new Date() &&
      new Date(s.end_date) >= new Date(),
  );
  const pastSprints = sprints.filter((s) => s.exam_id === examId && s.id !== activeSprint?.id);

  const handleCreateSprint = async () => {
    if (!startDate || !endDate || !dailyHours) {
      setError("Completa todos los campos para continuar");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("La fecha de inicio debe ser antes de la fecha de fin");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const targetGradeNum = targetGrade ? parseFloat(targetGrade) : null;

      await createSprint(examId, startDate, endDate, parseFloat(dailyHours), targetGradeNum);

      setStartDate("");
      setEndDate("");
      setDailyHours("2");
      setTargetGrade("");
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el sprint");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Screen
        title={subject}
        subtitle="Plan de estudio para este examen"
        withTabBar={false}
        closable
      >
        {sprintsLoading ? (
          <Skeleton height={180} className="mt-4 rounded-card" />
        ) : activeSprint ? (
          <>
            <SectionHeader title="Sprint activo" />
            <SprintTracker sprint={activeSprint} />
            <MochiBubble
              className="mt-4"
              text="La constancia diaria es tu mejor herramienta. Un día a la vez."
            />
          </>
        ) : (
          <View className="mt-6 items-center">
            <MochiCharacter expression="happy" size={130} />
            <MochiBubble
              className="mt-1 self-stretch"
              text="Armemos un sprint: unos días de repaso con una meta clara."
            >
              <View className="mt-3">
                <Button title="Crear sprint" onPress={() => setShowCreateModal(true)} />
              </View>
            </MochiBubble>
          </View>
        )}

        {pastSprints.length > 0 ? (
          <>
            <SectionHeader title="Sprints anteriores" />
            <ListGroup>
              {pastSprints.map((sprint) => (
                <ListRow
                  key={sprint.id}
                  title={`${formatShortDate(sprint.start_date)} – ${formatShortDate(sprint.end_date)}`}
                  subtitle={`${sprint.daily_target_hours}h al día`}
                  leading={<IconTile icon="flag" tint="ok" />}
                />
              ))}
            </ListGroup>
          </>
        ) : null}
      </Screen>

      <Sheet
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo sprint"
      >
        {error ? <Caption className="mb-3 text-danger">{error}</Caption> : null}
        <DateField
          label="Empieza"
          value={startDate}
          onChange={setStartDate}
          minimum={toLocalISODate()}
        />
        <DateField
          label="Termina"
          value={endDate}
          onChange={setEndDate}
          minimum={startDate || toLocalISODate()}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="Horas al día"
              placeholder="2"
              value={dailyHours}
              onChangeText={setDailyHours}
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Nota meta (opcional)"
              placeholder="9.0"
              value={targetGrade}
              onChangeText={setTargetGrade}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <View className="mt-2">
          <Button
            title="Crear sprint"
            loading={creating}
            onPress={() => void handleCreateSprint()}
          />
        </View>
      </Sheet>
    </>
  );
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short" })
    .format(new Date(y, m - 1, d))
    .replace(".", "");
}

export default ExamSprintProgressScreen;
