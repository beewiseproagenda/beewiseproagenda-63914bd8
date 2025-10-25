import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Privacidade = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Política de Privacidade (LGPD)</CardTitle>
            <p className="text-muted-foreground">Última atualização: 25/10/2025</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
              <p>
                Esta Política descreve como tratamos dados pessoais conforme a LGPD (Lei 13.709/2018). 
                O BeeWise atua como Controladora de dados dos usuários do serviço e Operadora/Suboperadora 
                em fluxos específicos que envolvem nossos provedores.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Dados Pessoais Tratados</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Identificação:</strong> nome, e-mail (e outros que você optar por cadastrar).</li>
                <li><strong>Contato:</strong> telefone (quando informado).</li>
                <li><strong>Acesso/Autenticação:</strong> credenciais (armazenadas de forma segura), tokens/sessões.</li>
                <li><strong>Uso do Sistema:</strong> registros de ações, datas/horas de agendamentos, status, valores informados por você no uso profissional.</li>
                <li><strong>Faturamento (Stripe):</strong> dados necessários ao processamento de pagamentos (ex.: e-mail, identificadores de cobrança, histórico de assinaturas). Não armazenamos dados completos de cartão; tais dados são processados pelo Stripe.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Finalidades e Bases Legais</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Prestação do serviço (execução de contrato):</strong> criação/gestão de agendamentos, clientes e registros financeiros internos; manutenção de conta; processamento de assinaturas.</li>
                <li><strong>Segurança e prevenção a fraudes</strong> (legítimo interesse/obrigação legal).</li>
                <li><strong>Comunicações operacionais</strong> sobre o serviço (execução de contrato/legítimo interesse).</li>
                <li><strong>Cumprimento de obrigações legais</strong> (ex.: fiscais, consumeristas, ordens administrativas/judiciais).</li>
                <li><strong>Melhoria contínua</strong> (legítimo interesse), com dados agregados e/ou pseudoanonimizados sempre que possível.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Operadores/Suboperadores (Lovable, Supabase, Stripe)</h2>
              <p className="mb-3">Utilizamos provedores para viabilizar o BeeWise:</p>
              <ul className="list-disc pl-6 space-y-2 mb-3">
                <li>
                  <strong>Lovable</strong> – hospedagem/execução de Front-End e parte de Back-End;
                  <br />Site: <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://lovable.dev</a>
                </li>
                <li>
                  <strong>Supabase</strong> – banco de dados, autenticação, armazenamento e funções de servidor;
                  <br />Site: <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://supabase.com</a>
                </li>
                <li>
                  <strong>Stripe</strong> – processamento de pagamentos e gestão de assinaturas;
                  <br />Site: <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://stripe.com</a>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Esses provedores tratam dados pessoais em nosso nome e segundo nossas instruções contratuais, 
                adotando padrões elevados de segurança. Além da nossa Política, aplicam-se também as políticas 
                de privacidade/segurança desses provedores, inclusive no que diz respeito a transferências 
                internacionais de dados (quando houver).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Compartilhamento de Dados</h2>
              <p>
                Não vendemos ou alugamos seus dados. Compartilhamos dados apenas com: (i) Operadores/Suboperadores 
                citados; (ii) autoridades quando requerido por lei; e (iii) terceiros estritamente necessários à 
                execução do contrato e à operação segura do serviço.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Armazenamento e Segurança</h2>
              <p>
                Adotamos controles técnicos e administrativos para proteger dados pessoais (criptografia em 
                repouso/trânsito, controle de acesso, políticas de banco com escopo mínimo, logs e auditoria). 
                Apesar de nossos esforços, nenhum sistema é 100% inviolável. Em caso de incidente relevante, 
                adotaremos as medidas cabíveis e notificaremos os titulares e autoridades quando exigido por lei.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Direitos do Titular</h2>
              <p className="mb-2">Nos termos da LGPD, você pode solicitar:</p>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>Confirmação de tratamento e acesso aos dados;</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários/excessivos;</li>
                <li>Portabilidade, nos termos da ANPD;</li>
                <li>Informações sobre compartilhamentos/operadores;</li>
                <li>Revogação de consentimentos (quando aplicável).</li>
              </ul>
              <p>
                Pedidos podem ser enviados a <a href="mailto:privacidade@beewiseproagenda.com.br" className="text-primary hover:underline">privacidade@beewiseproagenda.com.br</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Retenção e Eliminação</h2>
              <p>
                Conservamos dados enquanto necessários para prestação do serviço, cumprimento de obrigações 
                legais/regulatórias, exercício regular de direitos e legítimos interesses (respeitando prazos 
                de prescrição). Após tais períodos, dados são eliminados ou anonimizados de forma segura.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Cookies, Cache e PWA</h2>
              <p>
                Utilizamos cookies e armazenamento local para autenticação, preferências e funcionamento do PWA. 
                Atualizações podem depender de limpeza de cache/cookies ou recarregamento. Você pode gerenciar 
                cookies nas configurações do navegador, ciente de que certas funções podem ser afetadas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Transferências Internacionais</h2>
              <p>
                Os provedores podem realizar tratamento em outros países. Adotamos salvaguardas contratuais e 
                técnicas para assegurar níveis adequados de proteção, conforme a LGPD.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Atualizações desta Política</h2>
              <p>
                Podemos atualizar esta Política para refletir mudanças legais, técnicas ou operacionais. 
                Publicaremos a versão atualizada com a respectiva data. O uso contínuo do serviço após as 
                alterações indica ciência.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Encarregado (DPO) e Contato</h2>
              <p>
                Dúvidas, solicitações de titulares ou comunicações sobre privacidade:
                <br />
                <a href="mailto:privacidade@beewiseproagenda.com.br" className="text-primary hover:underline">privacidade@beewiseproagenda.com.br</a>
              </p>
            </section>

            <div className="flex gap-4 pt-6 border-t">
              <Link to="/cadastro">
                <Button variant="outline">Voltar ao Cadastro</Button>
              </Link>
              <Link to="/termos">
                <Button variant="outline">Termos de Uso</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacidade;