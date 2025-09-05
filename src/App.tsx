
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu, LogOut } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Clientes from "./pages/Clientes";
import PacotesServicos from "./pages/PacotesServicos";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Cadastros from "./pages/Cadastros";
import { SubscriptionSuccess } from "./pages/SubscriptionSuccess";
import { MySubscription } from "./pages/MySubscription";
import Landing from "./pages/Landing";
import ResetPassword from "./pages/ResetPassword";
import PaymentReturn from "./pages/PaymentReturn";
import EmailVerified from "./pages/EmailVerified";
import SubscriptionReturn from "./pages/SubscriptionReturn";
import Subscribe from "./pages/Subscribe";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { useSubscription } from "./hooks/useSubscription";
import { Button } from "./components/ui/button";
import { useToast } from "./hooks/use-toast";
import { usePWA } from "./hooks/usePWA";
import { useInstallGuide } from "./hooks/useInstallGuide";
import { PWAInstallPrompt, PWAStatus } from "./components/PWAInstallPrompt";
import { InstallGuideModal } from "./components/InstallGuideModal";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { MPDiagnostic } from "./components/MPDiagnostic";

const queryClient = new QueryClient();

// Componente para o layout protegido
const ProtectedLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border backdrop-blur flex items-center px-4 bg-amber-400">
            <SidebarTrigger className="mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">
                {profile ? `${title} de ${profile.first_name}` : title}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-foreground hover:bg-background/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </header>
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// Componente principal de roteamento
const AppRoutes = () => {
  const { user, loading: authLoading } = useAuth();
  const { currentSubscription, loading: subscriptionLoading, isActiveSubscription } = useSubscription();

  console.log('[AppRoutes] Estado atual:', {
    authLoading,
    subscriptionLoading,
    hasUser: !!user,
    userEmail: user?.email,
    emailConfirmed: user?.email_confirmed_at !== null,
    subscriptionStatus: currentSubscription?.status,
    isActiveSubscription,
    currentPath: window.location.pathname
  });

  // Verificar se é link de reset de senha
  const isPasswordResetLink = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return window.location.pathname === '/redefinir-senha' || 
           (urlParams.get('type') === 'recovery' && urlParams.get('access_token'));
  };

  // Mostrar loading enquanto carrega
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Carregando..." />
      </div>
    );
  }

  // Rotas públicas (quando não há usuário ou é reset de senha)
  if (!user || isPasswordResetLink()) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/verificado" element={<EmailVerified />} />
        <Route path="/assinar" element={<Subscribe />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/assinatura/retorno" element={<SubscriptionReturn />} />
        <Route path="/assinatura/sucesso" element={<SubscriptionSuccess />} />
        <Route path="/payment/return" element={<PaymentReturn />} />
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    );
  }

  // Se usuário está logado, verificar assinatura
  if (subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Verificando assinatura..." />
      </div>
    );
  }

  // Verificar se email foi confirmado
  const emailConfirmed = user.email_confirmed_at !== null;
  if (!emailConfirmed) {
    return (
      <Routes>
        <Route path="/assinar" element={<Subscribe />} />
        <Route path="*" element={<Navigate to="/assinar" replace />} />
      </Routes>
    );
  }

  // Verificar se tem assinatura ativa
  if (!isActiveSubscription) {
    return (
      <Routes>
        <Route path="/assinar" element={<Subscribe />} />
        <Route path="/assinatura/retorno" element={<SubscriptionReturn />} />
        <Route path="/payment/return" element={<PaymentReturn />} />
        <Route path="*" element={<Navigate to="/assinar" replace />} />
      </Routes>
    );
  }

  // Rotas protegidas para usuários com assinatura ativa
  return (
    <Routes>
      {/* Redirecionar root para dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Rotas da aplicação */}
      <Route path="/dashboard" element={
        <ProtectedLayout title="Dashboard">
          <Dashboard />
        </ProtectedLayout>
      } />
      
      <Route path="/agenda" element={
        <ProtectedLayout title="Agenda">
          <Agenda />
        </ProtectedLayout>
      } />
      
      <Route path="/clientes" element={
        <ProtectedLayout title="Clientes">
          <Clientes />
        </ProtectedLayout>
      } />
      
      <Route path="/pacotes-servicos" element={
        <ProtectedLayout title="Pacotes e Serviços">
          <PacotesServicos />
        </ProtectedLayout>
      } />
      
      <Route path="/financeiro" element={
        <ProtectedLayout title="Financeiro">
          <Financeiro />
        </ProtectedLayout>
      } />
      
      <Route path="/relatorios" element={
        <ProtectedLayout title="Relatórios">
          <Relatorios />
        </ProtectedLayout>
      } />
      
      <Route path="/configuracoes" element={
        <ProtectedLayout title="Configurações">
          <Configuracoes />
        </ProtectedLayout>
      } />
      
      <Route path="/cadastros" element={
        <ProtectedLayout title="Cadastros">
          <Cadastros />
        </ProtectedLayout>
      } />
      
      <Route path="/minha-assinatura" element={
        <ProtectedLayout title="Minha Assinatura">
          <MySubscription />
        </ProtectedLayout>
      } />

      {/* Rotas especiais sempre acessíveis */}
      <Route path="/assinar" element={<Subscribe />} />
      <Route path="/assinatura/retorno" element={<SubscriptionReturn />} />
      <Route path="/payment/return" element={<PaymentReturn />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const AppContent = () => {
  const { registerServiceWorker } = usePWA();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { 
    deviceType, 
    shouldShowGuide, 
    hasSeenInSession, 
    showGuide, 
    hideGuide, 
    markAsShownInSession,
    disablePermanently,
    isDisabledPermanently 
  } = useInstallGuide();

  // Register service worker on app start
  React.useEffect(() => {
    registerServiceWorker();
  }, []);

  // Show install guide on login based on conditions
  React.useEffect(() => {
    if (user && profile) {
      const shouldShow = !isDisabledPermanently && !hasSeenInSession;
      
      if (shouldShow) {
        const timer = setTimeout(() => {
          showGuide();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profile, isDisabledPermanently, hasSeenInSession, showGuide]);

  return (
    <>
      <div className="fixed top-4 left-4 right-4 z-50 max-w-4xl mx-auto">
        <MPDiagnostic />
      </div>
      <div className="pt-40">
        <AppRoutes />
      </div>
      <PWAInstallPrompt />
      <PWAStatus />
      <InstallGuideModal
        isOpen={shouldShowGuide}
        onClose={hideGuide}
        deviceType={deviceType}
        onMarkAsShownInSession={markAsShownInSession}
        onDisablePermanently={disablePermanently}
      />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
