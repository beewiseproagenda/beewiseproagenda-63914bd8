import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Download, 
  HelpCircle, 
  Smartphone, 
  Monitor, 
  Settings, 
  RefreshCw,
  Trash2,
  Info,
  Moon,
  Sun
} from 'lucide-react';
import { useInstallGuide } from '@/hooks/useInstallGuide';
import { usePWA } from '@/hooks/usePWA';
import { InstallGuideModal } from '@/components/InstallGuideModal';
import { useToast } from '@/hooks/use-toast';
import { useThemeContext } from '@/components/ThemeProvider';

function Configuracoes() {
  const { 
    deviceType, 
    shouldShowGuide, 
    hasSeenInSession, 
    showGuide, 
    hideGuide, 
    markAsShownInSession,
    disablePermanently,
    resetGuide,
    isDisabledPermanently 
  } = useInstallGuide();
  const { isInstalled, checkForUpdates } = usePWA();
  const { toast } = useToast();
  const { theme, toggleTheme, isDark } = useThemeContext();

  const handleShowInstallGuide = () => {
    showGuide();
  };

  const handleCheckUpdates = async () => {
    await checkForUpdates();
    toast({
      title: "Verificação concluída",
      description: "O app está atualizado.",
    });
  };

  const handleResetGuide = () => {
    resetGuide();
    toast({
      title: "Guia resetado",
      description: "O guia de instalação será mostrado novamente no próximo login.",
    });
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'android':
      case 'ios':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getDeviceLabel = () => {
    switch (deviceType) {
      case 'android':
        return 'Android';
      case 'ios':
        return 'iOS (iPhone/iPad)';
      default:
        return 'Desktop';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      {/* Theme Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Aparência
          </CardTitle>
          <CardDescription>
            Configure o tema da aplicação entre modo claro e escuro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <div>
                <p className="font-medium">Modo escuro</p>
                <p className="text-sm text-muted-foreground">
                  {isDark ? "Tema escuro ativado" : "Tema claro ativado"}
                </p>
              </div>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
              aria-label="Alternar modo escuro"
            />
          </div>
        </CardContent>
      </Card>

      {/* PWA Installation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Instalação do App
          </CardTitle>
          <CardDescription>
            Gerencie a instalação e configurações do Progressive Web App
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {getDeviceIcon()}
              <div>
                <p className="font-medium">Dispositivo detectado</p>
                <p className="text-sm text-muted-foreground">{getDeviceLabel()}</p>
              </div>
            </div>
            <Badge variant={isInstalled ? "default" : "secondary"}>
              {isInstalled ? "Instalado" : "Não instalado"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleShowInstallGuide} variant="outline" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Ver guia de instalação
            </Button>

            {isInstalled && (
              <Button onClick={handleCheckUpdates} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Verificar atualizações
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Configurações do guia
            </h4>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Status do guia</p>
                <p className="text-sm text-muted-foreground">
                  {isDisabledPermanently 
                    ? "Desabilitado permanentemente" 
                    : hasSeenInSession 
                      ? "Mostrado nesta sessão" 
                      : "Será mostrado no próximo login"
                  }
                </p>
              </div>
              {(hasSeenInSession || isDisabledPermanently) && (
                <Button onClick={handleResetGuide} variant="outline" size="sm" className="gap-2">
                  <Trash2 className="h-3 w-3" />
                  Resetar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do App</CardTitle>
          <CardDescription>
            Detalhes sobre o BeeWise Progressive Web App
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Funcionalidades</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Funciona offline</li>
                <li>• Atualizações automáticas</li>
                <li>• Notificações push</li>
                <li>• Interface nativa</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Compatibilidade</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Android (Chrome, Edge, Brave)</li>
                <li>• iOS (Safari)</li>
                <li>• Desktop (Chrome, Edge, Firefox)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <InstallGuideModal
        isOpen={shouldShowGuide}
        onClose={hideGuide}
        deviceType={deviceType}
        onMarkAsShownInSession={markAsShownInSession}
        onDisablePermanently={disablePermanently}
      />
    </div>
  );
}

export default Configuracoes;