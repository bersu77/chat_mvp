"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    redirect("/login");
  }

  redirect("/chat");
}
