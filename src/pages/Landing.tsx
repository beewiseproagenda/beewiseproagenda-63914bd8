import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, DollarSign, BarChart3, Star, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import beeWiseHero from "@/assets/beewise-hero.png";
import beeWiseLogo from "@/assets/beewise-logo.png";
const Landing = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-[hsl(var(--bw-off-white))] py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <img src={beeWiseLogo} alt="BeeWise" className="h-16 mb-6 mx-auto" />
            <h1 className="text-4xl md:text-6xl font-bold text-[hsl(var(--bw-blue-dark))] mb-6">Organização para quem empreende</h1>
            <p className="text-xl text-[hsl(var(--bw-blue-dark))] opacity-80 mb-8">
              Agende, controle e prospere. Tudo em um só lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button size="lg" className="bg-[hsl(var(--bw-yellow-dark))] hover:bg-[hsl(var(--bw-yellow-dark))]/90 text-[hsl(var(--bw-blue-dark))] font-semibold" onClick={() => navigate('/cadastro')}>
                Começar agora
              </Button>
              <Button variant="outline" size="lg" className="border-[hsl(var(--bw-blue-dark))] text-[hsl(var(--bw-blue-dark))] hover:bg-[hsl(var(--bw-blue-dark))] hover:text-white" onClick={() => navigate('/login')}>
                Fazer Login
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <img src={beeWiseHero} alt="BeeWise Logo" className="w-80 h-80 object-contain drop-shadow-2xl" />
              {/* Decorative elements */}
              
              
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-[hsl(var(--bw-yellow-light))] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-lg bg-white">
              <CardContent className="p-8">
                <Calendar className="w-16 h-16 text-[hsl(var(--bw-blue-dark))] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-[hsl(var(--bw-blue-dark))] mb-4">
                  Agenda Inteligente
                </h3>
                <p className="text-[hsl(var(--bw-blue-dark))] opacity-80">
                  Agendamento rápido e intuitivo para você e seus clientes.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg bg-white">
              <CardContent className="p-8">
                <DollarSign className="w-16 h-16 text-[hsl(var(--bw-blue-dark))] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-[hsl(var(--bw-blue-dark))] mb-4">
                  Controle Financeiro
                </h3>
                <p className="text-[hsl(var(--bw-blue-dark))] opacity-80">
                  Entradas, saídas e lucro em tempo real.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg bg-white">
              <CardContent className="p-8">
                <BarChart3 className="w-16 h-16 text-[hsl(var(--bw-blue-dark))] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-[hsl(var(--bw-blue-dark))] mb-4">
                  Organização Completa
                </h3>
                <p className="text-[hsl(var(--bw-blue-dark))] opacity-80">
                  Tudo o que você precisa em um só painel.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[hsl(var(--bw-off-white))] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[hsl(var(--bw-blue-dark))] mb-6">
              Controle seu negócio de forma simples e eficiente
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <Clock className="w-8 h-8 text-[hsl(var(--bw-yellow-dark))] mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-[hsl(var(--bw-blue-dark))] mb-2">
                      Ganhe tempo
                    </h3>
                    <p className="text-[hsl(var(--bw-blue-dark))] opacity-80">
                      Automatize seus agendamentos e tenha mais tempo para focar no que realmente importa.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 text-[hsl(var(--bw-yellow-dark))] mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-[hsl(var(--bw-blue-dark))] mb-2">
                      Evite perdas de clientes
                    </h3>
                    <p className="text-[hsl(var(--bw-blue-dark))] opacity-80">
                      Sistema de notificações e lembretes para nunca mais perder um compromisso.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <TrendingUp className="w-8 h-8 text-[hsl(var(--bw-yellow-dark))] mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-[hsl(var(--bw-blue-dark))] mb-2">
                      Visualize seus resultados
                    </h3>
                    <p className="text-[hsl(var(--bw-blue-dark))] opacity-80">
                      Dashboards intuitivos para acompanhar o crescimento do seu negócio.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-80 h-96 bg-gradient-to-br from-[hsl(var(--bw-yellow-light))] to-[hsl(var(--bw-yellow-dark))] rounded-3xl flex items-center justify-center shadow-2xl">
                <div className="w-64 h-80 bg-white rounded-2xl shadow-inner flex items-center justify-center">
                  <BarChart3 className="w-24 h-24 text-[hsl(var(--bw-blue-dark))]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-[hsl(var(--bw-off-white))] py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-[hsl(var(--bw-blue-dark))] mb-16">
            O que nossos usuários dizem
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[{
            name: "Maria Silva",
            role: "Esteticista",
            content: "Revolucionou minha agenda! Agora tenho controle total dos meus atendimentos e finanças."
          }, {
            name: "João Santos",
            role: "Personal Trainer",
            content: "Interface super intuitiva. Meus clientes adoram a facilidade de agendamento."
          }, {
            name: "Ana Costa",
            role: "Consultora",
            content: "Finalmente posso visualizar meus lucros de forma clara. Recomendo para todos!"
          }].map((testimonial, index) => <Card key={index} className="border-none shadow-lg bg-white">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-[hsl(var(--bw-yellow-dark))] text-[hsl(var(--bw-yellow-dark))]" />)}
                  </div>
                  <p className="text-[hsl(var(--bw-blue-dark))] opacity-80 mb-4">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-[hsl(var(--bw-blue-dark))]">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-[hsl(var(--bw-blue-dark))] opacity-60">
                      {testimonial.role}
                    </p>
                  </div>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[hsl(var(--bw-yellow-light))] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[hsl(var(--bw-blue-dark))] mb-6">
            Comece hoje e transforme a forma como você gerencia seu negócio
          </h2>
          <p className="text-xl text-[hsl(var(--bw-blue-dark))] opacity-80 mb-8">
            Junte-se a milhares de profissionais que já descobriram o poder da organização inteligente.
          </p>
          <Button size="lg" className="bg-[hsl(var(--bw-yellow-dark))] hover:bg-[hsl(var(--bw-yellow-dark))]/90 text-[hsl(var(--bw-blue-dark))] font-semibold text-lg px-8 py-4" onClick={() => navigate('/cadastro')}>
            Quero minha conta BeeWise agora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(var(--bw-blue-dark))] py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-white mb-4">BeeWise</h3>
          <p className="text-white opacity-80">
            Organização para quem empreende
          </p>
        </div>
      </footer>
    </div>;
};
export default Landing;