import { redirect } from "next/navigation";
import { logout } from "@/lib/auth";

export async function POST() {
  await logout();
  redirect("/login");
}
