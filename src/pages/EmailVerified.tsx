import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const EmailVerified = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingToken, setOnboardingToken] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Force sign out to prevent auto-login after email verification
        await supabase.auth.signOut();
        
        const otToken = searchParams.get('ot');
        
        if (otToken) {
          // Validate onboarding token - no auth needed for this endpoint
          const { data, error } = await supabase.functions.invoke('validate-onboarding-token', {
            body: { token: otToken }
          });
          
          if (error || !data?.valid) {
            setError('Seu link expirou. Solicite um novo e-mail de verificação.');
          } else {
            setOnboardingToken(otToken);
          }
        } else {
          setError('Link inválido. Solicite um novo e-mail de verificação.');
        }
      } catch (err) {
        console.error('Erro na verificação:', err);
        setError('Erro ao verificar e-mail. Tente novamente.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [searchParams]);

  const handleContinue = () => {
    if (onboardingToken) {
      navigate(`/assinar?ot=${onboardingToken}`);
    }
  };

  const handleResendEmail = () => {
    navigate('/cadastro');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Verificando seu e-mail...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Link Expirado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={handleResendEmail} className="w-full">
              Solicitar Novo E-mail
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-green-600">E-mail Confirmado!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Seu e-mail foi confirmado com sucesso. Agora escolha um plano para ativar seu acesso ao BeeWise.
          </p>
          <Button onClick={handleContinue} className="w-full">
            Escolher Plano
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerified;