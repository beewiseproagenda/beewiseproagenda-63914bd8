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
            <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
              <p>
                Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e 
                protegemos suas informações pessoais em conformidade com a Lei Geral de 
                Proteção de Dados (LGPD) - Lei nº 13.709/2018.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Dados Coletados</h2>
              <p>Coletamos os seguintes tipos de dados pessoais:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Dados de identificação: nome, sobrenome, e-mail</li>
                <li>Dados de contato: telefone</li>
                <li>Dados de acesso: senha criptografada</li>
                <li>Dados de uso: registros de atividades no sistema</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Finalidade do Tratamento</h2>
              <p>Utilizamos seus dados pessoais para:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Prestação dos serviços contratados</li>
                <li>Autenticação e segurança da conta</li>
                <li>Comunicação sobre o serviço</li>
                <li>Cumprimento de obrigações legais</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
              <p>
                Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros, 
                exceto quando necessário para prestação do serviço ou cumprimento de 
                obrigações legais.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Armazenamento e Segurança</h2>
              <p>
                Seus dados são armazenados em serviços de nuvem seguros com criptografia. 
                Implementamos medidas técnicas e administrativas para proteger suas informações 
                contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Seus Direitos</h2>
              <p>Conforme a LGPD, você tem direito a:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Confirmação da existência de tratamento</li>
                <li>Acesso aos seus dados</li>
                <li>Correção de dados incompletos ou incorretos</li>
                <li>Eliminação dos dados desnecessários</li>
                <li>Revogação do consentimento</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Contato</h2>
              <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, 
                entre em contato através do e-mail: privacidade@beewiseproagenda.com.br
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