
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
import Reset from "./pages/Reset";
import PaymentReturn from "./pages/PaymentReturn";
import EmailVerified from "./pages/EmailVerified";
import Subscribe from "./pages/Subscribe";
import SubscriptionReturn from "./pages/SubscriptionReturn";
import AuthCallback from './pages/AuthCallback';
import Termos from './pages/Termos';
import Privacidade from './pages/Privacidade';
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { useAuthAndSubscription } from "./hooks/useAuthAndSubscription";
import ProtectedRoute from "./components/ProtectedRoute";
import { Button } from "./components/ui/button";
import { useToast } from "./hooks/use-toast";
import { usePWA } from "./hooks/usePWA";
import { useInstallGuide } from "./hooks/useInstallGuide";
import { PWAInstallPrompt, PWAStatus } from "./components/PWAInstallPrompt";
import { InstallGuideModal } from "./components/InstallGuideModal";
import { LoadingSpinner } from "./components/LoadingSpinner";
// QueryClient moved to main.tsx

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
            <SidebarTrigger className="mr-2 sm:mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                {profile ? `${title} de ${profile.first_name}` : title}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-foreground hover:bg-background/10 flex-shrink-0"
            >
              <LogOut className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
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
  const { user, status } = useAuthAndSubscription();

  // Verificar se é link de reset de senha
  const isPasswordResetLink = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return window.location.pathname === '/redefinir-senha' || 
           window.location.pathname === '/reset' ||
           (urlParams.get('type') === 'recovery' && urlParams.get('access_token'));
  };

  // Mostrar loading enquanto carrega
  if (status === 'loading') {
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
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/assinar" element={<Subscribe />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/assinatura/retorno" element={<SubscriptionReturn />} />
        <Route path="/assinatura/sucesso" element={<SubscriptionSuccess />} />
        <Route path="/payment/return" element={<PaymentReturn />} />
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    );
  }

  // Para usuários logados, usar ProtectedRoute para todas as rotas
  return (
    <Routes>
      {/* Redirecionar root para dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Rotas da aplicação protegidas */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <ProtectedLayout title="Dashboard">
            <Dashboard />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/agenda" element={
        <ProtectedRoute>
          <ProtectedLayout title="Agenda">
            <Agenda />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/clientes" element={
        <ProtectedRoute>
          <ProtectedLayout title="Clientes">
            <Clientes />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/pacotes-servicos" element={
        <ProtectedRoute>
          <ProtectedLayout title="Pacotes e Serviços">
            <PacotesServicos />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/financeiro" element={
        <ProtectedRoute>
          <ProtectedLayout title="Financeiro">
            <Financeiro />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/relatorios" element={
        <ProtectedRoute>
          <ProtectedLayout title="Relatórios">
            <Relatorios />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/configuracoes" element={
        <ProtectedRoute>
          <ProtectedLayout title="Configurações">
            <Configuracoes />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/cadastros" element={
        <ProtectedRoute>
          <ProtectedLayout title="Cadastros">
            <Cadastros />
          </ProtectedLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/minha-assinatura" element={
        <ProtectedRoute>
          <ProtectedLayout title="Minha Assinatura">
            <MySubscription />
          </ProtectedLayout>
        </ProtectedRoute>
      } />

      {/* Rotas especiais que também passam pelo ProtectedRoute */}
      <Route path="/assinar" element={
        <ProtectedRoute>
          <Subscribe />
        </ProtectedRoute>
      } />
      <Route path="/assinatura/retorno" element={
        <ProtectedRoute>
          <SubscriptionReturn />
        </ProtectedRoute>
      } />
      <Route path="/assinatura/sucesso" element={
        <ProtectedRoute>
          <SubscriptionSuccess />
        </ProtectedRoute>
      } />
      <Route path="/payment/return" element={
        <ProtectedRoute>
          <PaymentReturn />
        </ProtectedRoute>
      } />
      
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
      <AppRoutes />
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
  <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
