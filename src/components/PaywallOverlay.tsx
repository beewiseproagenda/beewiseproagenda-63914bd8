import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Crown } from "lucide-react";

interface PaywallOverlayProps {
  isOpen: boolean;
  trialDays?: number;
}

export const PaywallOverlay = ({ isOpen, trialDays = 7 }: PaywallOverlayProps) => {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    navigate('/assinar', { replace: true });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md mx-auto bg-background border border-border"
        hideClose={true}
      >
        <div className="flex flex-col items-center space-y-6 p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Período de teste encerrado
            </h2>
            <p className="text-muted-foreground">
              Seu teste gratuito de {trialDays} dias terminou. Para continuar usando, assine o plano mensal ou anual.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Dias de teste: {trialDays}
            </Badge>
            <Badge variant="destructive" className="text-sm">
              Expirado
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              onClick={handleSubscribe}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <Crown className="w-4 h-4 mr-2" />
              Assinar agora
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};