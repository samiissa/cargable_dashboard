import { LoginForm } from "../../src/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12">
      <h1 className="text-2xl font-semibold text-onSurface">Panel de Administración Cargable</h1>
      <LoginForm />
    </main>
  );
}
