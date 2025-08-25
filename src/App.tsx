import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { Button } from "./components/ui/button";
import { useToast } from "./hooks/use-toast";
import { usePWA } from "./hooks/usePWA";
import { useInstallGuide } from "./hooks/useInstallGuide";
import { PWAInstallPrompt, PWAStatus } from "./components/PWAInstallPrompt";
import { InstallGuideModal } from "./components/InstallGuideModal";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { registerServiceWorker } = usePWA();
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
      // Check all conditions for showing the guide
      const shouldShow = !isDisabledPermanently && !hasSeenInSession;
      
      if (shouldShow) {
        // Delay to let the user see the dashboard first
        const timer = setTimeout(() => {
          showGuide();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profile, isDisabledPermanently, hasSeenInSession, showGuide]);

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

  // Check if current URL is a password reset link
  const isPasswordResetLink = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return window.location.pathname === '/redefinir-senha' || 
           (urlParams.get('type') === 'recovery' && urlParams.get('access_token'));
  };

  // Public routes (login/signup/password reset)
  if (!user || isPasswordResetLink()) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/payment/return" element={<PaymentReturn />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    );
  }

  // Protected routes
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
                {profile ? `Dashboard de ${profile.first_name}` : "BeeWise - ProAgenda"}
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
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/pacotes-servicos" element={<PacotesServicos />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/cadastros" element={<Cadastros />} />
              <Route path="/assinatura/sucesso" element={<SubscriptionSuccess />} />
              <Route path="/minha-assinatura" element={<MySubscription />} />
              <Route path="/payment/return" element={<PaymentReturn />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
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
      </div>
    </SidebarProvider>
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