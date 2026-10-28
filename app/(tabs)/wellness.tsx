import { Redirect } from "expo-router";

/** Bienestar pasó a ser la pestaña Yo; se conserva la ruta para enlaces y notificaciones viejas. */
export default function WellnessRedirect() {
  return <Redirect href="/(tabs)/me" />;
}
