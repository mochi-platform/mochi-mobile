import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
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
import type { StudySession } from "@/src/shared/types/database";

function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h > 0 && m > 0) return `${h}h ${m}min`;
	if (h > 0) return `${h}h`;
	if (m > 0) return `${m}min`;
	return `${seconds}s`;
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

type SessionGroup = {
	date: string;
	label: string;
	sessions: StudySession[];
};

function groupSessionsByDate(sessions: StudySession[]): SessionGroup[] {
	const groupMap = new Map<string, StudySession[]>();
	for (const session of sessions) {
		const date = session.completed_at.slice(0, 10);
		const existing = groupMap.get(date);
		if (existing) {
			existing.push(session);
		} else {
			groupMap.set(date, [session]);
		}
	}
	return Array.from(groupMap.entries()).map(([date, groupSessions]) => ({
		date,
		label: formatRelativeDate(groupSessions[0].completed_at),
		sessions: groupSessions,
	}));
}

export function StudyScreen() {
	const { session } = useSession();
	const [sessions, setSessions] = useState<StudySession[]>([]);
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

			const { data, error: sbError } = await supabase
				.from("study_sessions")
				.select("*")
				.eq("user_id", userId)
				.order("completed_at", { ascending: false });

			if (sbError) throw sbError;

			loadingScale.value = withTiming(1, { duration: 180 });
			setSessions((data ?? []) as StudySession[]);
		} catch (err) {
			loadingScale.value = withTiming(1, { duration: 180 });
			setError(
				err instanceof Error ? err.message : "Error cargando el historial",
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

	const totalSessions = sessions.length;
	const totalSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
	const totalHours = Math.floor(totalSeconds / 3600);
	const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
	const groups = groupSessionsByDate(sessions);

	return (
		<View className="flex-1 bg-blue-50">
			<ScrollView
				className="flex-1 px-5 pt-12"
				showsVerticalScrollIndicator={false}
			>
				<View className="mb-5 flex-row items-center">
					<Ionicons name="book" size={20} color="#1d4ed8" />
					<Text className="ml-2 text-2xl font-extrabold text-blue-900">
						Estudio
					</Text>
				</View>

				<Text className="text-sm font-semibold text-blue-600">
					Historial de sesiones completadas
				</Text>

				{!loading && totalSessions > 0 && (
					<View className="mt-4 flex-row gap-3">
						<View className="flex-1 rounded-2xl border-2 border-purple-200 bg-purple-100 p-4">
							<Text className="text-3xl font-extrabold text-purple-900">
								{totalSessions}
							</Text>
							<Text className="mt-1 text-xs font-bold text-purple-600">
								{totalSessions === 1 ? "sesión" : "sesiones"}
							</Text>
						</View>
						<View className="flex-1 rounded-2xl border-2 border-blue-200 bg-blue-100 p-4">
							<Text className="text-3xl font-extrabold text-blue-900">
								{totalHours > 0 ? `${totalHours}h` : `${totalMinutes}min`}
							</Text>
							<Text className="mt-1 text-xs font-bold text-blue-600">
								{totalHours > 0 && totalMinutes > 0
									? `${totalMinutes}min más`
									: "estudiadas"}
							</Text>
						</View>
					</View>
				)}

				{loading ? (
					<View className="mt-12 items-center">
						<Animated.View style={loadingAnimatedStyle}>
							<MochiCharacter mood="thinking" size={90} />
						</Animated.View>
						<Text className="mt-4 text-sm font-semibold text-blue-700">
							Cargando historial...
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
				) : sessions.length === 0 ? (
					<View className="mt-8 items-center rounded-3xl border-2 border-blue-200 bg-white p-8">
						<MochiCharacter mood="happy" size={88} />
						<Text className="mt-3 text-center text-base font-bold text-blue-900">
							Aún no tienes sesiones registradas
						</Text>
						<Text className="mt-2 text-center text-sm font-semibold text-blue-500">
							Completa tu primer bloque de estudio para verlo aquí
						</Text>
					</View>
				) : (
					<View className="mt-6">
						{groups.map((group) => (
							<View key={group.date} className="mb-5">
								<Text className="mb-2 text-xs font-extrabold uppercase tracking-widest text-blue-400">
									{group.label}
								</Text>
								{group.sessions.map((studySession) => (
									<View
										key={studySession.id}
										className="mb-2 flex-row items-center rounded-2xl border-2 border-blue-100 bg-white p-3"
									>
										<View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
											<Ionicons name="book-outline" size={18} color="#7c3aed" />
										</View>
										<View className="ml-3 flex-1">
											<Text className="text-sm font-bold text-slate-800">
												{studySession.subject}
											</Text>
											<Text className="mt-0.5 text-xs font-semibold text-purple-600">
												{formatDuration(studySession.duration_seconds)}
											</Text>
										</View>
										<Text className="text-xs font-semibold text-blue-400">
											{new Date(studySession.completed_at).toLocaleTimeString(
												"es-ES",
												{
													hour: "2-digit",
													minute: "2-digit",
												},
											)}
										</Text>
									</View>
								))}
							</View>
						))}
					</View>
				)}

				<View className="h-24" />
			</ScrollView>
			<FloatingActionButton
				onPress={() => router.push("/exam-log")}
				containerClassName="bg-pink-500"
				accessibilityLabel="Registrar examen"
			/>
		</View>
	);
}

export default StudyScreen;
