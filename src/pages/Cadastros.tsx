import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlanSelector } from '@/components/PlanSelector';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, CreditCard, CheckCircle } from 'lucide-react';

const Cadastros = () => {
  const [activeTab, setActiveTab] = useState('dados');
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const { toast } = useToast();

  // Form states
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsUpdating(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Dados atualizados',
        description: 'Seus dados pessoais foram atualizados com sucesso.',
      });
      
      refetch();
      setActiveTab('planos');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const canProceedToPlans = firstName && lastName;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Cadastros</h1>
        <p className="text-muted-foreground">
          Complete seus dados e escolha seu plano BeeWise Pro
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Dados Pessoais
            {canProceedToPlans && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="planos" 
            disabled={!canProceedToPlans}
            className="flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Escolha seu Plano
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>
                Complete suas informações pessoais para prosseguir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome *</Label>
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
                    <Label htmlFor="lastName">Sobrenome *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="Seu sobrenome"
                    />
                  </div>
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
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para alterar o e-mail, entre em contato com o suporte
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isUpdating || !canProceedToPlans}
                    className="flex-1"
                  >
                    {isUpdating ? (
                      <>
                        <LoadingSpinner />
                        Salvando...
                      </>
                    ) : (
                      'Salvar e Continuar'
                    )}
                  </Button>
                  
                  {canProceedToPlans && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('planos')}
                      className="flex-1"
                    >
                      Ir para Planos
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Escolha seu Plano
              </CardTitle>
              <CardDescription>
                Selecione o plano BeeWise Pro que melhor atende suas necessidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanSelector />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Cadastros;