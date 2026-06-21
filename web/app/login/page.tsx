import { Mail } from "lucide-react";
import { AuthForm } from "./auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Personalized Mass AI Mailer</h1>
          <p className="text-sm text-muted-foreground">
            Resume-aware, human-in-the-loop cold outreach.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in or create an account to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm oauthError={Boolean(error)} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
