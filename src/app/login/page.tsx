import Link from "next/link";
import LoginForm from "./login-form";
import { getServerT } from "@/lib/i18n-server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const t = await getServerT();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-indigo-700">
          JTracker
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t("login.tagline")}
        </p>
      </div>

      <LoginForm errorMessage={error} next={next} />

      <Link
        href="/"
        className="mt-6 text-center text-sm font-medium text-gray-500"
      >
        {t("login.back")}
      </Link>
    </main>
  );
}
