import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
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
import Landing from "./pages/Landing";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { Button } from "./components/ui/button";
import { useToast } from "./hooks/use-toast";
import { useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWAStatus } from "@/components/PWAStatus";
const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { signOut } = useAuth();
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

  // Check if current URL is a password reset link
  const isPasswordResetLink = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return window.location.pathname === '/redefinir-senha' || 
           (urlParams.get('type') === 'recovery' && urlParams.get('access_token'));
  };

  // Public routes (login/signup/password reset) - Always use light theme
  if (!user || isPasswordResetLink()) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange={false}
        forcedTheme="light"
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Protected routes - Full theme control for authenticated users
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <header className="h-16 border-b border-border backdrop-blur flex items-center px-4 bg-amber-400">
              <SidebarTrigger className="mr-4">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div className="flex-1 flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">
                  {profile ? `Dashboard de ${profile.first_name}` : "BeeWise - ProAgenda"}
                </h1>
                <PWAStatus />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

const App = () => {
  const { registerServiceWorker } = usePWA();

  useEffect(() => {
    // Register service worker on app startup
    registerServiceWorker();
  }, [registerServiceWorker]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
          <PWAInstallPrompt />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
export default App;