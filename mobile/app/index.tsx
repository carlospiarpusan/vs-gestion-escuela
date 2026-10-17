import { Redirect } from "expo-router";

export default function PublicHomeScreen() {
  return <Redirect href="/login" />;
}
