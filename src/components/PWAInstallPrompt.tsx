import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Wifi, WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useToast } from '@/hooks/use-toast';

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();
  const { toast } = useToast();
  const [showPrompt, setShowPrompt] = React.useState(false);

  React.useEffect(() => {
    if (isInstallable && !isInstalled) {
      // Show install prompt after a delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      toast({
        title: "App instalado!",
        description: "BeeWise foi adicionado à sua tela inicial.",
      });
      setShowPrompt(false);
    } else {
      toast({
        title: "Erro na instalação",
        description: "Não foi possível instalar o app. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Instalar BeeWise
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrompt(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Adicione o BeeWise à sua tela inicial para acesso rápido e uso offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 mb-3">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm text-muted-foreground">
              {isOnline ? 'Conectado' : 'Offline - App funcionará sem internet'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Instalar
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPrompt(false)}
              size="sm"
            >
              Agora não
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PWAStatus = () => {
  const { isInstalled, isOnline } = usePWA();

  if (!isInstalled) return null;

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur border text-sm">
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3 text-green-600" />
            <span className="text-green-600">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-amber-600" />
            <span className="text-amber-600">Offline</span>
          </>
        )}
      </div>
    </div>
  );
};