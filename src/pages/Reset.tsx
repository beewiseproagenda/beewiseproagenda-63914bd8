import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";

type Phase = "checking" | "form" | "done" | "error";

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        // 1) Troca o código do link por uma sessão (suporta magic/recovery)
        if (typeof window !== "undefined" && window.location.hash) {
          try {
            await supabase.auth.exchangeCodeForSession(window.location.hash);
          } catch {
            // em alguns fluxos o evento PASSWORD_RECOVERY chega sem necessidade de exchange
          }
        }

        // 2) Ouve mudanças de auth; quando for PASSWORD_RECOVERY, libera o form
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") {
            setPhase("form");
          }
        });
        unsub = () => sub.subscription.unsubscribe();

        // 3) Fallback: se já houver sessão válida, mostra o form
        const { data } = await supabase.auth.getSession();
        if (data?.session) setPhase("form");
        else if (phase !== "form") setPhase("checking");
      } catch (e: any) {
        setError(e?.message || "Erro ao preparar o reset de senha.");
        setPhase("error");
      }
    })();

    return () => unsub?.();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!password || password.length < 8) {
      setError("A senha precisa ter ao menos 8 caracteres.");
      setIsSubmitting(false);
      return;
    }
    
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setPhase("error");
      setIsSubmitting(false);
      return;
    }

    setPhase("done");
    setTimeout(() => {
      // redireciona para login com flag de sucesso
      window.location.assign("/login?reset=success");
    }, 1200);
  }

  if (phase === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <LoadingSpinner text="Verificando link de recuperação..." />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">Erro no reset de senha</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = "/login"}
              variant="outline"
              className="w-full"
            >
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
              <CheckCircle className="h-8 w-8" />
              Senha alterada com sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">Redirecionando para o login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // phase === "form"
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Defina sua nova senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Digite sua nova senha"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Confirme sua nova senha"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}