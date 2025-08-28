import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Check, X, Eye, EyeOff } from 'lucide-react';

interface PasswordRequirement {
  text: string;
  met: boolean;
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    { text: 'Mínimo 8 caracteres', met: false },
    { text: '1 letra maiúscula (A-Z)', met: false },
    { text: '1 letra minúscula (a-z)', met: false },
    { text: '1 número (0-9)', met: false }
  ]);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Validate password requirements
    const newRequirements = [
      { text: 'Mínimo 8 caracteres', met: password.length >= 8 },
      { text: '1 letra maiúscula (A-Z)', met: /[A-Z]/.test(password) },
      { text: '1 letra minúscula (a-z)', met: /[a-z]/.test(password) },
      { text: '1 número (0-9)', met: /[0-9]/.test(password) }
    ];
    setRequirements(newRequirements);
  }, [password]);

  useEffect(() => {
    // Check if passwords match
    setPasswordsMatch(password === confirmPassword && password.length > 0);
  }, [password, confirmPassword]);

  const allRequirementsMet = requirements.every(req => req.met) && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validar todos os requisitos
    if (!allRequirementsMet) {
      toast({
        title: "Erro na validação",
        description: "Verifique se todos os requisitos foram atendidos",
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Digite sua senha"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Requisitos da senha:</Label>
                <div className="space-y-1">
                  {requirements.map((requirement, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      {requirement.met ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={requirement.met ? "text-green-600" : "text-muted-foreground"}>
                        {requirement.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirme sua senha"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-destructive flex items-center space-x-1">
                  <X className="h-3 w-3" />
                  <span>As senhas não coincidem</span>
                </p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-sm text-green-600 flex items-center space-x-1">
                  <Check className="h-3 w-3" />
                  <span>As senhas coincidem</span>
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !allRequirementsMet}
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