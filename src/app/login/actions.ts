"use server";
import { redirect } from "next/navigation";
import { checkCredentials, createSession, destroySession } from "@/lib/session";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");
  const display = checkCredentials(name, password);
  if (!display) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return "Nombre o contraseña incorrectos.";
  }
  await createSession(display);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
