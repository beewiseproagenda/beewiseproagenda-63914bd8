import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message === 'Invalid login credentials' 
          ? "Email ou senha incorretos" 
          : error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Você será redirecionado para o dashboard."
      });
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Sua senha"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link 
              to="/cadastro" 
              className="text-primary hover:underline text-sm"
            >
              Não tem conta? Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;