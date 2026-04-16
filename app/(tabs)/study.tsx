import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { supabase } from "@/src/shared/lib/supabase";
import { useSession } from "@/src/core/providers/SessionContext";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { FloatingActionButton } from "@/src/shared/components/FloatingActionButton";
import { TabHeader } from "@/src/shared/components/TabHeader";

type StudySessionItem = {
	id: string;
	subject: string;
	duration_seconds: number;
	completed_at: string;
};

type ExamLogItem = {
	id: string;
	subject: string;
	grade: number | null;
	max_grade: number | null;
	exam_date: string;
	notes: string | null;
	preparation_notes: string | null;
	is_upcoming: boolean | null;
};

type StudyBlockItem = {
	id: string;
	subject: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
	color: string;
};

type TimelineItem = {
	id: string;
	dateKey: string;
	sortKey: number;
	iconName: keyof typeof Ionicons.glyphMap;
	iconBackgroundClassName: string;
	badgeClassName: string;
	badgeLabel: string;
	title: string;
	subtitle: string;
	meta: string;
	detail?: string | null;
};

type ActivityGroup = {
	date: string;
	label: string;
	items: TimelineItem[];
};

const dayLabelMap: Record<number, string> = {
	0: "Domingo",
	1: "Lunes",
	2: "Martes",
	3: "Miércoles",
	4: "Jueves",
	5: "Viernes",
	6: "Sábado",
};

function formatDuration(seconds: number): string {
	const totalMinutes = Math.max(1, Math.round(seconds / 60));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
	if (hours > 0) return `${hours}h`;
	return `${minutes}min`;
}

function formatRelativeDate(dateStr: string): string {
	const sessionDate = dateStr.slice(0, 10);
	const today = new Date();
	const todayStr = today.toISOString().slice(0, 10);
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStr = yesterday.toISOString().slice(0, 10);

	if (sessionDate === todayStr) return "Hoy";
	if (sessionDate === yesterdayStr) return "Ayer";

	return new Intl.DateTimeFormat("es-ES", {
		weekday: "long",
		day: "numeric",
		month: "short",
	}).format(new Date(sessionDate + "T12:00:00"));
}

function formatExamScore(grade: number, maxGrade: number): string {
	return `${grade}/${maxGrade}`;
}

function getResultBadge(
	gradeValue: number,
	maxGrade: number,
): { label: string; className: string } {
	const percentage = maxGrade > 0 ? gradeValue / maxGrade : 0;

	if (percentage >= 0.9) {
		return { label: "Excelente", className: "bg-emerald-100 text-emerald-800" };
	}

	if (percentage >= 0.7) {
		return { label: "Aprobado", className: "bg-amber-100 text-amber-800" };
	}

	return { label: "Pendiente", className: "bg-rose-100 text-rose-700" };
}

function formatExamDate(value: string): string {
	return new Intl.DateTimeFormat("es-ES", {
		day: "numeric",
		month: "short",
	})
		.format(new Date(`${value}T00:00:00`))
		.replace(".", "")
		.toLowerCase();
}

function getDaysUntil(value: string): number {
	const today = new Date();
	const start = new Date(today.toISOString().slice(0, 10) + "T00:00:00").getTime();
	const end = new Date(`${value}T00:00:00`).getTime();
	return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function getUpcomingLabel(value: string): string {
	const days = getDaysUntil(value);
	if (days <= 0) return "Hoy";
	if (days === 1) return "Mañana";
	return `En ${days} días`;
}

function getCurrentDayOfWeek(): number {
	return new Date().getDay();
}

function getBlockDurationLabel(startTime: string, endTime: string): string {
	const [startHours = "0", startMinutes = "0"] = startTime.split(":");
	const [endHours = "0", endMinutes = "0"] = endTime.split(":");
	const startTotal = Number(startHours) * 60 + Number(startMinutes);
	const endTotal = Number(endHours) * 60 + Number(endMinutes);
	const durationMinutes = Math.max(0, endTotal - startTotal);
	const durationHours = Math.floor(durationMinutes / 60);
	const remainingMinutes = durationMinutes % 60;

	if (durationHours > 0 && remainingMinutes > 0) {
		return `${durationHours}h ${remainingMinutes}min`;
	}

	if (durationHours > 0) {
		return `${durationHours}h`;
	}

	return `${durationMinutes}min`;
}

function groupItemsByDate(items: TimelineItem[]): ActivityGroup[] {
	const groupMap = new Map<string, TimelineItem[]>();

	for (const item of items) {
		const existing = groupMap.get(item.dateKey);
		if (existing) {
			existing.push(item);
		} else {
			groupMap.set(item.dateKey, [item]);
		}
	}

	return Array.from(groupMap.entries())
		.sort(([left], [right]) => right.localeCompare(left))
		.map(([date, groupItems]) => ({
			date,
			label: formatRelativeDate(groupItems[0].dateKey),
			items: groupItems.sort((left, right) => right.sortKey - left.sortKey),
		}));
}

export function StudyScreen() {
	const { session } = useSession();
	const [sessions, setSessions] = useState<StudySessionItem[]>([]);
	const [examLogs, setExamLogs] = useState<ExamLogItem[]>([]);
	const [studyBlocks, setStudyBlocks] = useState<StudyBlockItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadingScale = useSharedValue(1);

	const loadingAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: loadingScale.value }],
	}));

	const loadSessions = useCallback(async () => {
		const userId = session?.user.id;
		if (!userId) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			loadingScale.value = withRepeat(
				withSequence(
					withTiming(1.06, {
						duration: 650,
						easing: Easing.inOut(Easing.quad),
					}),
					withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
				),
				-1,
				false,
			);

			const [sessionsRes, examsRes, studyBlocksRes] = await Promise.all([
				supabase
					.from("study_sessions")
					.select("id, subject, duration_seconds, completed_at")
					.eq("user_id", userId)
					.order("completed_at", { ascending: false }),
				supabase
					.from("exam_logs")
					.select(
						"id, subject, grade, max_grade, exam_date, notes, preparation_notes, is_upcoming",
					)
					.eq("user_id", userId)
					.order("exam_date", { ascending: false }),
				supabase
					.from("study_blocks")
					.select("id, subject, day_of_week, start_time, end_time, color")
					.eq("user_id", userId)
					.order("day_of_week", { ascending: true })
					.order("start_time", { ascending: true }),
			]);

			if (sessionsRes.error) throw sessionsRes.error;
			if (examsRes.error) throw examsRes.error;
			if (studyBlocksRes.error) throw studyBlocksRes.error;

			loadingScale.value = withTiming(1, { duration: 180 });
			setSessions((sessionsRes.data ?? []) as StudySessionItem[]);
			setExamLogs((examsRes.data ?? []) as ExamLogItem[]);
			setStudyBlocks((studyBlocksRes.data ?? []) as StudyBlockItem[]);
		} catch (err) {
			loadingScale.value = withTiming(1, { duration: 180 });
			setError(
				err instanceof Error
					? err.message
					: "Error cargando sesiones y exámenes",
			);
		} finally {
			setLoading(false);
		}
	}, [session?.user.id, loadingScale]);

	useFocusEffect(
		useCallback(() => {
			void loadSessions();
		}, [loadSessions]),
	);

	const completedExams = useMemo(
		() => examLogs.filter((exam) => !exam.is_upcoming),
		[examLogs],
	);
	const upcomingExams = useMemo(
		() =>
			examLogs
				.filter((exam) => exam.is_upcoming)
				.sort(
					(left, right) =>
						new Date(`${left.exam_date}T00:00:00`).getTime() -
						new Date(`${right.exam_date}T00:00:00`).getTime(),
				),
		[examLogs],
	);
	const timelineItems = useMemo<TimelineItem[]>(() => {
		const studyItems = sessions.map((studySession) => ({
			id: `study-${studySession.id}`,
			dateKey: studySession.completed_at.slice(0, 10),
			sortKey: new Date(studySession.completed_at).getTime(),
			iconName: "book-outline" as const,
			iconBackgroundClassName: "bg-pink-100",
			badgeClassName: "bg-fuchsia-100 text-fuchsia-700",
			badgeLabel: "Sesión",
			title: studySession.subject,
			subtitle: `${formatDuration(studySession.duration_seconds)} de estudio`,
			meta: new Date(studySession.completed_at).toLocaleTimeString("es-ES", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		}));

		const examItems = completedExams.map((exam) => {
			const scoreLabel =
				exam.grade !== null && exam.max_grade !== null
					? formatExamScore(exam.grade, exam.max_grade)
					: "Resultado registrado";
			const badge =
				exam.grade !== null && exam.max_grade !== null
					? getResultBadge(exam.grade, exam.max_grade)
					: { label: "Examen", className: "bg-sky-100 text-sky-700" };

			return {
				id: `exam-${exam.id}`,
				dateKey: exam.exam_date.slice(0, 10),
				sortKey: new Date(`${exam.exam_date}T12:00:00`).getTime(),
				iconName: "school-outline" as const,
				iconBackgroundClassName: "bg-sky-100",
				badgeClassName: badge.className,
				badgeLabel: badge.label,
				title: exam.subject,
				subtitle: scoreLabel,
				meta: formatExamDate(exam.exam_date),
				detail: exam.notes ?? exam.preparation_notes ?? null,
			};
		});

		return [...studyItems, ...examItems].sort((left, right) => right.sortKey - left.sortKey);
	}, [completedExams, sessions]);
	const groups = useMemo(() => groupItemsByDate(timelineItems), [timelineItems]);

	const totalSessions = sessions.length;
	const totalSeconds = sessions.reduce((sum, current) => sum + current.duration_seconds, 0);
	const totalHours = Math.floor(totalSeconds / 3600);
	const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
	const totalExams = examLogs.length;
	const currentDayOfWeek = getCurrentDayOfWeek();
	const todayBlocks = studyBlocks.filter(
		(block) => block.day_of_week === currentDayOfWeek,
	);
	const upcomingBlocks = studyBlocks.filter(
		(block) => block.day_of_week !== currentDayOfWeek,
	);
	const hasTimelineContent = groups.length > 0;
	const hasUpcomingExams = upcomingExams.length > 0;
	const hasScheduledBlocks = studyBlocks.length > 0;

	return (
		<View className="flex-1 bg-pink-50">
			<ScrollView
				className="flex-1 px-5 pt-12"
				showsVerticalScrollIndicator={false}
			>
				<TabHeader
					iconName="school"
					title="Estudio"
					subtitle="Sesiones, exámenes y seguimiento"
					iconColor="#be185d"
					titleClassName="text-2xl font-extrabold text-pink-900"
					subtitleClassName="text-sm font-semibold text-pink-500"
				/>

				{!loading && (totalSessions > 0 || totalExams > 0) && (
					<View className="mt-4 flex-row gap-3">
						<View className="flex-1 rounded-2xl border-2 border-fuchsia-200 bg-fuchsia-100 p-4">
							<Text className="text-3xl font-extrabold text-fuchsia-900">
								{totalSessions}
							</Text>
							<Text className="mt-1 text-xs font-bold text-fuchsia-600">
								{totalSessions === 1 ? "sesión" : "sesiones"}
							</Text>
						</View>
						<View className="flex-1 rounded-2xl border-2 border-sky-200 bg-sky-100 p-4">
							<Text className="text-3xl font-extrabold text-sky-900">
								{totalExams}
							</Text>
							<Text className="mt-1 text-xs font-bold text-sky-600">
								{totalExams === 1 ? "examen" : "exámenes"}
							</Text>
						</View>
						<View className="flex-1 rounded-2xl border-2 border-rose-200 bg-rose-100 p-4">
							<Text className="text-3xl font-extrabold text-rose-900">
								{totalHours > 0 ? `${totalHours}h` : `${totalMinutes}min`}
							</Text>
							<Text className="mt-1 text-xs font-bold text-rose-600">
								{totalHours > 0 && totalMinutes > 0 ? `${totalMinutes}min más` : "de estudio"}
							</Text>
						</View>
					</View>
				)}

				{hasScheduledBlocks && (
					<View className="mt-5 rounded-3xl border-2 border-violet-200 bg-violet-50 p-4">
						<View className="flex-row items-center justify-between">
							<View className="flex-row items-center">
								<Ionicons name="calendar-outline" size={18} color="#6d28d9" />
								<Text className="ml-2 text-base font-extrabold text-violet-900">
									Sesiones programadas
								</Text>
							</View>
							<Text className="text-xs font-bold text-violet-700">
								{studyBlocks.length}
							</Text>
						</View>

						{todayBlocks.length > 0 ? (
							<View className="mt-3 gap-2">
								{todayBlocks.map((block) => (
									<View
										key={block.id}
										className="flex-row items-center justify-between rounded-2xl border border-violet-100 bg-white p-3"
									>
										<View className="flex-1">
											<Text className="text-sm font-bold text-slate-800">
												{block.subject}
											</Text>
											<Text className="mt-0.5 text-xs font-semibold text-violet-600">
												{block.start_time} - {block.end_time} · {getBlockDurationLabel(block.start_time, block.end_time)}
											</Text>
										</View>
										<TouchableOpacity
											className="ml-3 rounded-full bg-violet-600 px-3 py-2"
											onPress={() => router.push(`/study-timer?blockId=${block.id}`)}
											accessibilityRole="button"
											accessibilityLabel={`Iniciar ${block.subject}`}
										>
											<Text className="text-xs font-extrabold text-white">
												Iniciar
											</Text>
										</TouchableOpacity>
									</View>
								))}
							</View>
						) : (
							<View className="mt-3 rounded-2xl border border-violet-100 bg-white p-3">
								<Text className="text-sm font-semibold text-slate-600">
									No tienes sesiones programadas para hoy.
								</Text>
							</View>
						)}

						{upcomingBlocks.length > 0 && (
							<View className="mt-3 rounded-2xl border border-violet-100 bg-white p-3">
								<Text className="text-xs font-extrabold uppercase tracking-widest text-violet-500">
									Próximas sesiones
								</Text>
								<View className="mt-2 gap-2">
									{upcomingBlocks.slice(0, 4).map((block) => (
										<View key={block.id} className="flex-row items-center justify-between rounded-2xl bg-violet-50 px-3 py-2">
											<View className="flex-1">
												<Text className="text-sm font-bold text-slate-800">
													{block.subject}
												</Text>
												<Text className="text-xs font-semibold text-violet-600">
													{dayLabelMap[block.day_of_week]} · {block.start_time}
												</Text>
											</View>
											<TouchableOpacity
												className="ml-3 rounded-full border border-violet-200 bg-white px-3 py-1.5"
												onPress={() => router.push(`/study-timer?blockId=${block.id}`)}
												accessibilityRole="button"
												accessibilityLabel={`Iniciar ${block.subject}`}
											>
												<Text className="text-xs font-extrabold text-violet-700">Iniciar</Text>
											</TouchableOpacity>
										</View>
									))}
								</View>
							</View>
						)}
					</View>
				)}

				{hasUpcomingExams && (
					<View className="mt-5 rounded-3xl border-2 border-amber-200 bg-amber-50 p-4">
						<View className="flex-row items-center justify-between">
							<View className="flex-row items-center">
								<Ionicons name="calendar-outline" size={18} color="#b45309" />
								<Text className="ml-2 text-base font-extrabold text-amber-900">
									Próximos exámenes
								</Text>
							</View>
							<Text className="text-xs font-bold text-amber-700">
								{upcomingExams.length}
							</Text>
						</View>

						<View className="mt-3 gap-2">
							{upcomingExams.slice(0, 3).map((exam) => (
								<View
									key={exam.id}
									className="flex-row items-start rounded-2xl border border-amber-100 bg-white p-3"
								>
									<View className="h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
										<Ionicons
											name="calendar-outline"
											size={18}
											color="#b45309"
										/>
									</View>
									<View className="ml-3 flex-1">
										<Text className="text-sm font-bold text-slate-800">
											{exam.subject}
										</Text>
										<Text className="mt-0.5 text-xs font-semibold text-amber-700">
											{formatExamDate(exam.exam_date)} · {getUpcomingLabel(exam.exam_date)}
										</Text>
										{exam.preparation_notes ? (
											<Text className="mt-1 text-xs font-medium text-slate-500">
												{exam.preparation_notes}
											</Text>
										) : null}
									</View>
								</View>
							))}
						</View>
					</View>
				)}

				{loading ? (
					<View className="mt-12 items-center">
						<Animated.View style={loadingAnimatedStyle}>
							<MochiCharacter mood="thinking" size={90} />
						</Animated.View>
						<Text className="mt-4 text-sm font-semibold text-pink-700">
							Cargando sesiones y exámenes...
						</Text>
					</View>
				) : error ? (
					<View className="mt-6 rounded-3xl border-2 border-red-200 bg-red-50 p-4">
						<Text className="text-sm font-semibold text-red-700">{error}</Text>
						<TouchableOpacity
							className="mt-3 items-center rounded-xl bg-red-500 py-2"
							onPress={() => void loadSessions()}
						>
							<Text className="font-bold text-white">Reintentar</Text>
						</TouchableOpacity>
					</View>
				) : !hasTimelineContent ? (
					<View className="mt-8 items-center rounded-3xl border-2 border-pink-200 bg-white p-8">
						<MochiCharacter mood="happy" size={88} />
						<Text className="mt-3 text-center text-base font-bold text-pink-900">
							Aún no hay sesiones ni exámenes registrados
						</Text>
						<Text className="mt-2 text-center text-sm font-semibold text-pink-500">
							Empieza una sesión de estudio o registra tu primer examen para verlo aquí
						</Text>
					</View>
				) : (
					<View className="mt-6">
						{groups.map((group) => (
							<View key={group.date} className="mb-5">
								<Text className="mb-2 text-xs font-extrabold uppercase tracking-widest text-pink-400">
									{group.label}
								</Text>
								{group.items.map((item) => (
									<View
										key={item.id}
										className="mb-2 flex-row items-start rounded-2xl border-2 border-pink-100 bg-white p-3"
									>
										<View className={`h-10 w-10 items-center justify-center rounded-xl ${item.iconBackgroundClassName}`}>
											<Ionicons
												name={item.iconName}
												size={18}
												color={item.iconName === "school-outline" ? "#0284c7" : "#be185d"}
											/>
										</View>
										<View className="ml-3 flex-1">
											<View className="flex-row items-center justify-between gap-2">
												<Text className="flex-1 text-sm font-bold text-slate-800">
													{item.title}
												</Text>
												<Text className="text-xs font-semibold text-pink-400">
													{item.meta}
												</Text>
											</View>
											<Text className="mt-0.5 text-xs font-semibold text-pink-600">
												{item.subtitle}
											</Text>
											{item.detail ? (
												<Text className="mt-1 text-xs font-medium text-slate-500">
													{item.detail}
												</Text>
											) : null}
											<View
												className={`mt-2 self-start rounded-full px-2 py-1 ${item.badgeClassName}`}
											>
												<Text className="text-[10px] font-extrabold uppercase tracking-widest">
													{item.badgeLabel}
												</Text>
											</View>
										</View>
									</View>
								))}
							</View>
						))}
					</View>
				)}

				<View className="h-20" />
			</ScrollView>
			<FloatingActionButton
				onPress={() => router.push("/study-create")}
				containerClassName="bg-teal-500"
				borderClassName="border-teal-300"
				iconName="calendar-outline"
				accessibilityLabel="Crear bloque de estudio"
				bottomOffset={72}
			/>
			<FloatingActionButton
				onPress={() => router.push("/exam-log")}
				containerClassName="bg-pink-500"
				borderClassName="border-pink-300"
				iconName="document-text-outline"
				accessibilityLabel="Registrar examen"
			/>
		</View>
	);
}

export default StudyScreen;