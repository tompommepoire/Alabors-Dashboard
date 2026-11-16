import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  return (
    <main className="shell">
      <p className="brand">myalabor</p>
      <h1>Passkey registrieren</h1>
      <p className="lead">
        Mit Setup-Token und Geräte-Biometrie (Fingerprint / Face / PIN) ein
        Konto anlegen.
      </p>
      <section className="panel">
        <RegisterForm initialToken={token} />
      </section>
    </main>
  );
}
