import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { usePWA } from '@/hooks/usePWA';
import { Download, Smartphone, Share, Plus, X } from 'lucide-react';

export const PWAInstallPrompt = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    showIOSInstructions: showIOSModal,
    installApp, 
    showIOSInstructionsModal,
    hideIOSInstructions 
  } = usePWA();

  if (isInstalled || isDismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      showIOSInstructionsModal();
    } else {
      const success = await installApp();
      if (success) {
        setIsDismissed(true);
      }
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <>
      {/* Install Banner */}
      <Card className="fixed bottom-4 left-4 right-4 z-50 border-primary/20 bg-background/95 backdrop-blur-sm md:left-auto md:right-4 md:w-80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-primary" />
              Instalar BeeWise
              <Badge variant="secondary" className="text-xs">PWA</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground mb-3">
            Instale nosso app para acesso rápido e experiência completa offline.
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleInstall}
              size="sm"
              className="flex-1"
            >
              <Download className="h-3 w-3 mr-1" />
              {isIOS ? 'Ver Instruções' : 'Instalar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* iOS Instructions Modal */}
      <Dialog open={showIOSModal} onOpenChange={hideIOSInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Instalar BeeWise no iOS
            </DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para instalar o app na sua tela inicial
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Abra o menu de compartilhamento</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Toque no ícone <Share className="inline h-3 w-3 mx-1" /> na barra inferior do Safari
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Adicionar à Tela de Início</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Role para baixo e toque em <Plus className="inline h-3 w-3 mx-1" /> "Adicionar à Tela de Início"
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Confirmar instalação</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Toque em "Adicionar" para instalar o BeeWise na sua tela inicial
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={hideIOSInstructions}
              className="flex-1"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};