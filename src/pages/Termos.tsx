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
            <p className="text-muted-foreground">Última atualização: 25/10/2025</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
              <p>
                Ao utilizar o BeeWise Pro Agenda ("BeeWise", "Serviço"), você concorda com estes Termos de Uso. 
                Se não concordar com qualquer parte, não utilize o Serviço.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
              <p className="mb-3">
                O BeeWise é uma aplicação de gestão de agendamentos para profissionais (modelo 100% operado pelo 
                profissional, sem autoagendamento pelo cliente). A plataforma pode ser utilizada em Desktop, Mobile 
                e como PWA. A disponibilidade da versão mais recente pode exigir atualização de cache/cookies e 
                outras rotinas de atualização do navegador/sistema para refletir a última publicação.
              </p>
              <h3 className="text-lg font-semibold mb-2">2.1. Modelo Micro-SaaS e Infraestrutura</h3>
              <p className="mb-2">
                O BeeWise opera como micro-SaaS: um software focado e enxuto, com ciclo de atualização contínuo, 
                construído sobre provedores robustos:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-3">
                <li>
                  <strong>Lovable</strong> – Camadas de Front-End e parte do Back-End (build, deploy e editor visual).
                  <br />Site: <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://lovable.dev</a>
                </li>
                <li>
                  <strong>Supabase</strong> – Base de dados, autenticação e serviços de nuvem.
                  <br />Site: <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://supabase.com</a>
                </li>
                <li>
                  <strong>Stripe</strong> – Processamento de pagamentos (cobranças, recorrência e faturamento).
                  <br />Site: <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://stripe.com</a>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                <strong>Observação:</strong> Utilizamos provedores amplamente adotados e com infraestrutura de nível empresarial. 
                Ainda que operemos com práticas de alta disponibilidade, eventuais impactos em Lovable, Supabase ou Stripe 
                podem afetar momentaneamente o BeeWise. Trabalhamos para mitigar riscos e restabelecer serviços com agilidade 
                sempre que necessário.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Cadastro e Conta</h2>
              <p>
                Para usar o BeeWise, você deve criar uma conta com informações verdadeiras e atualizadas. 
                Você é responsável por guardar sua senha e por todas as ações realizadas na sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Planos, Preços e Cobrança</h2>
              <p className="mb-2"><strong>Período Freemium:</strong> 7 (sete) dias gratuitos para avaliação.</p>
              <p className="mb-2"><strong>Preços de lançamento (válidos para novembro e dezembro de 2025):</strong></p>
              <ul className="list-disc pl-6 mb-3">
                <li>R$ 14,90/mês</li>
                <li>R$ 9,90/ano (preço promocional de lançamento)</li>
              </ul>
              <p className="mb-2"><strong>Preços base a partir de 01/01/2026:</strong></p>
              <ul className="list-disc pl-6 mb-3">
                <li>R$ 24,90/mês</li>
                <li>R$ 19,90/ano</li>
              </ul>
              <p className="mb-2"><strong>Regras de transição (importante):</strong></p>
              <ul className="list-disc pl-6 mb-3">
                <li>Assinantes mensais que iniciaram em 2025 passarão automaticamente a pagar R$ 24,90/mês a partir de 01/01/2026.</li>
                <li>Assinantes anuais que contrataram em 2025 mantêm o preço promocional anual (R$ 9,90/ano) até o término do primeiro ano contratado. A partir da renovação, será aplicado o preço base vigente (R$ 19,90/ano), ou outro preço que esteja em vigor.</li>
              </ul>
              <p className="mb-2"><strong>Reajuste Anual por IPCA:</strong></p>
              <p className="mb-3">
                A partir de 01/01/2027, todo 01 de janeiro haverá correção dos planos com base no IPCA acumulado dos últimos 12 meses. 
                Quando aplicável, o reajuste será informado nos canais oficiais e refletido no ciclo de cobrança seguinte.
              </p>
              <p className="mb-2"><strong>Cobrança e Processamento:</strong></p>
              <p className="mb-3">
                As assinaturas e pagamentos são processados via Stripe. Você autoriza cobranças recorrentes conforme a periodicidade 
                do seu plano (mensal ou anual). Moeda: BRL (Reais). Tributos/taxas podem ser adicionados conforme a legislação aplicável. 
                Você pode alterar/cancelar sua assinatura antes da próxima renovação para evitar nova cobrança.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Uso Aceitável</h2>
              <p>
                Você concorda em usar o BeeWise apenas para fins legais, sem cometer abusos, fraudes, engenharia reversa, 
                acessos indevidos, spam ou qualquer conduta que prejudique o serviço, outros usuários ou terceiros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo, marca, recursos e funcionalidades do BeeWise são de propriedade da empresa e protegidos 
                por leis de direitos autorais e de propriedade intelectual. Estes Termos não concedem a você qualquer 
                direito sobre nossa propriedade intelectual.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Disponibilidade, Atualizações e PWA</h2>
              <p>
                O BeeWise é fornecido "como está". Apesar de trabalharmos por alta disponibilidade, não garantimos 
                funcionamento ininterrupto. Em PWAs instalados, a atualização para a versão mais recente ocorre quando 
                o aplicativo é aberto e detecta nova versão; em alguns casos, pode ser necessário recarregar ou limpar 
                o cache para aplicar mudanças.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitação de Responsabilidade</h2>
              <p>
                Na máxima extensão permitida por lei, a responsabilidade total do BeeWise por quaisquer danos está 
                limitada ao valor pago pelo serviço no período imediatamente anterior ao evento. Não nos responsabilizamos 
                por perdas indiretas, lucros cessantes ou danos decorrentes de indisponibilidade de provedores externos 
                (Lovable, Supabase, Stripe), caso fortuito ou força maior.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Alterações dos Termos e do Serviço</h2>
              <p>
                Podemos atualizar estes Termos e/ou aspectos do serviço para aprimoramentos, segurança, questões legais 
                e operacionais. Publicaremos a versão atualizada com a respectiva data de vigência. O uso contínuo do 
                BeeWise após as alterações implica concordância.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contato</h2>
              <p>
                Dúvidas sobre estes Termos: <a href="mailto:suporte@beewiseproagenda.com.br" className="text-primary hover:underline">suporte@beewiseproagenda.com.br</a>
              </p>
            </section>

            <section className="bg-muted p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Observações finais:</h3>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li>
                  <strong>Transparência de preços:</strong> os valores e datas informados acima prevalecem; 
                  comunicaremos eventuais mudanças pela interface do produto e/ou e-mail.
                </li>
                <li>
                  <strong>Reembolsos e cancelamentos:</strong> seguem a legislação brasileira e a política aplicável 
                  do Stripe para processamento de estornos/cancelamentos (quando houver).
                </li>
                <li>
                  <strong>Conformidade contínua:</strong> revisamos periodicamente nossas práticas de dados e segurança 
                  em conjunto com nossos provedores.
                </li>
              </ul>
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