import { LoginForm } from "../../src/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main>
      <h1>Cargable Admin Dashboard</h1>
      <LoginForm />
    </main>
  );
}
