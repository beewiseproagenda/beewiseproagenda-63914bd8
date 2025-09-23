import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Termos = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Termos de Uso</CardTitle>
            <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
              <p>
                Ao utilizar o BeeWise Pro Agenda, você concorda com estes termos de uso. 
                Se você não concordar com qualquer parte destes termos, não utilize nosso serviço.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
              <p>
                O BeeWise Pro Agenda é uma plataforma de agendamento e gestão empresarial 
                que oferece ferramentas para organização de compromissos, clientes e relatórios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Cadastro e Conta</h2>
              <p>
                Para utilizar nossos serviços, você deve criar uma conta fornecendo informações 
                precisas e atualizadas. Você é responsável pela segurança de sua senha e por 
                todas as atividades realizadas em sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Uso Aceitável</h2>
              <p>
                Você concorda em usar o serviço apenas para fins legais e de acordo com estes termos. 
                É proibido usar o serviço para atividades ilegais, fraudulentas ou prejudiciais.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo, recursos e funcionalidades do BeeWise Pro Agenda são propriedade 
                exclusiva da empresa e são protegidos por leis de direitos autorais e propriedade intelectual.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Limitação de Responsabilidade</h2>
              <p>
                O BeeWise Pro Agenda é fornecido "como está" e não garantimos que o serviço 
                será ininterrupto ou livre de erros. Nossa responsabilidade é limitada ao 
                valor pago pelo serviço.
              </p>
            </section>

            <div className="flex gap-4 pt-6 border-t">
              <Link to="/cadastro">
                <Button variant="outline">Voltar ao Cadastro</Button>
              </Link>
              <Link to="/privacidade">
                <Button variant="outline">Política de Privacidade</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Termos;