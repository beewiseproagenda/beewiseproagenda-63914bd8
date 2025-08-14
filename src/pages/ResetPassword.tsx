import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PasswordRequirement {
  text: string;
  met: boolean;
}

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    { text: 'Mínimo 8 caracteres', met: false },
    { text: '1 letra maiúscula (A-Z)', met: false },
    { text: '1 letra minúscula (a-z)', met: false },
    { text: '1 número (0-9)', met: false }
  ]);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user came from password reset email
    const checkTokenAndSetSession = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      
      if (accessToken && refreshToken && type === 'recovery') {
        try {
          // Set the session with the tokens from the URL
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          setHasValidToken(true);
        } catch (error) {
          console.error('Erro ao definir sessão:', error);
          setHasValidToken(false);
        }
      } else {
        setHasValidToken(false);
      }
      setIsCheckingToken(false);
    };

    checkTokenAndSetSession();
  }, [searchParams]);

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
    
    if (!allRequirementsMet) {
      toast({
        title: "Erro",
        description: "Verifique se todos os requisitos foram atendidos",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.includes('session_not_found') || error.message.includes('invalid_token')) {
          toast({
            title: "Token inválido ou expirado",
            description: "O link de redefinição é inválido ou expirou. Solicite um novo link.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro ao redefinir senha",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        setShowSuccess(true);
        toast({
          title: "Senha redefinida com sucesso!",
          description: "Redirecionando para o login..."
        });
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verificando link de redefinição...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">Link Inválido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              O link de redefinição de senha é inválido ou expirou.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Solicite um novo link de redefinição na tela de login.
            </p>
            <Link to="/login">
              <Button className="w-full" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">Senha Redefinida!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground mb-4">
                Sua senha foi redefinida com sucesso!
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecionando para o login em alguns segundos...
              </p>
            </div>
            <Link to="/login">
              <Button className="w-full">
                Ir para Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
          <p className="text-sm text-muted-foreground">
            Crie uma nova senha segura para sua conta
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Digite sua nova senha"
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
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirme sua nova senha"
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
              {loading ? "Salvando..." : "Salvar Nova Senha"}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                Voltar para Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;