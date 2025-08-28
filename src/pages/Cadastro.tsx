import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail } from 'lucide-react';

const Cadastro = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'personal' | 'email-sent'>('personal');
  const [resendLoading, setResendLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validar senhas
    if (password !== confirmPassword) {
      toast({
        title: "Erro na validação",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro na validação",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    const { data, error } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      phone: phone
    });

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message === 'User already registered'
          ? "Este email já está cadastrado"
          : error.message,
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    // Force sign out to prevent auto-login
    await supabase.auth.signOut();

    if (data.user) {
      // Create onboarding token
      try {
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('create-onboarding-token', {
          body: {
            userId: data.user.id,
            email: data.user.email
          }
        });

        if (tokenError) {
          throw tokenError;
        }

        console.log('Onboarding token created, step should change to email-sent');
        setStep('email-sent');
        
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Enviamos um e-mail para confirmação. Verifique sua caixa de entrada."
        });
      } catch (tokenError) {
        console.error('Error creating onboarding token:', tokenError);
        toast({
          title: "Erro no cadastro",
          description: "Erro ao criar token de verificação. Tente novamente.",
          variant: "destructive"
        });
      }
    }

    setLoading(false);
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    
    try {
      // Trigger password reset to resend email verification
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        throw error;
      }

      toast({
        title: "E-mail reenviado!",
        description: "Verifique sua caixa de entrada."
      });
    } catch (error) {
      console.error('Error resending email:', error);
      toast({
        title: "Erro ao reenviar e-mail",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };

  if (step === 'email-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold">Verifique seu E-mail</CardTitle>
            <p className="text-muted-foreground">
              Enviamos um link de verificação para <strong>{email}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Clique no link do e-mail para continuar com a escolha do seu plano.</p>
            </div>
            
            <Button 
              onClick={handleResendEmail} 
              variant="outline" 
              className="w-full"
              disabled={resendLoading}
            >
              {resendLoading ? "Reenviando..." : "Reenviar E-mail"}
            </Button>
            
            <div className="text-center">
              <Link 
                to="/login" 
                className="text-primary hover:underline text-sm"
              >
                Já tem conta? Faça login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Dados Pessoais</CardTitle>
          <p className="text-muted-foreground">
            Primeiro, vamos precisar de algumas informações suas
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Seu sobrenome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirme sua senha"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Continuar para validação do e-mail"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link 
              to="/login" 
              className="text-primary hover:underline text-sm"
            >
              Já tem conta? Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cadastro;