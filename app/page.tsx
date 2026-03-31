import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to admin dashboard as the entry point
  redirect("/admin/dashboard");
}
