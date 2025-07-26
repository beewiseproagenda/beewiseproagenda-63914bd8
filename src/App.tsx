import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu, LogOut } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Clientes from "./pages/Clientes";
import PacotesServicos from "./pages/PacotesServicos";
import Financeiro from "./pages/Financeiro";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { Button } from "./components/ui/button";
import { useToast } from "./hooks/use-toast";
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

  // Public routes (login/signup)
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="*" element={<Login />} />
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
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/pacotes-servicos" element={<PacotesServicos />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/relatorios" element={<Dashboard />} />
              <Route path="/configuracoes" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;