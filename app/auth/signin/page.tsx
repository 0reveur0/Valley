export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-semibold">Sign in to Valley</h1>
        <p className="mt-2 text-sm text-slate-400">Credentials and Google OAuth are wired up.</p>
        <div className="mt-6 space-y-3">
          <a
            href="/api/auth/signin"
            className="block rounded-lg bg-sky-600 px-4 py-3 text-center font-medium text-white"
          >
            Continue with email / password
          </a>
          <a
            href="/api/auth/signin/google"
            className="block rounded-lg border border-slate-700 px-4 py-3 text-center font-medium"
          >
            Continue with Google
          </a>
        </div>
      </div>
    </main>
  );
}
