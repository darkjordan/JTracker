import Link from "next/link";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-indigo-700">
          JTracker
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign in to keep your data safe across devices.
        </p>
      </div>

      <LoginForm errorMessage={error} />

      <Link
        href="/"
        className="mt-6 text-center text-sm font-medium text-gray-500"
      >
        ← Back
      </Link>
    </main>
  );
}
