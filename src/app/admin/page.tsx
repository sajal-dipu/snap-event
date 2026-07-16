import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("snapEvent-role")?.value;

  if (role === "admin") {
    redirect("/admin/dashboard");
  } else {
    redirect("/admin/login");
  }
}
