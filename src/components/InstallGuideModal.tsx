import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Monitor, 
  Share, 
  MoreVertical, 
  Download,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { DeviceType } from '@/hooks/useInstallGuide';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceType: DeviceType;
  onMarkAsShownInSession: () => void;
  onDisablePermanently: () => Promise<void>;
}

const AndroidInstructions = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
        1
      </div>
      <div className="flex-1">
        <p className="font-medium">Toque no menu</p>
        <p className="text-sm text-muted-foreground">
          Toque no ícone <MoreVertical className="inline h-4 w-4 mx-1" /> no canto superior direito
        </p>
      </div>
    </div>

    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
        2
      </div>
      <div className="flex-1">
        <p className="font-medium">Selecione "Adicionar à tela inicial"</p>
        <p className="text-sm text-muted-foreground">
          Procure pela opção com ícone <Download className="inline h-4 w-4 mx-1" />
        </p>
      </div>
    </div>

    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
        3
      </div>
      <div className="flex-1">
        <p className="font-medium">Confirme a instalação</p>
        <p className="text-sm text-muted-foreground">
          Confirme o nome do app e toque em "Adicionar"
        </p>
      </div>
    </div>
  </div>
);

const IOSInstructions = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
        1
      </div>
      <div className="flex-1">
        <p className="font-medium">Toque no ícone de compartilhar</p>
        <p className="text-sm text-muted-foreground">
          Toque no ícone <Share className="inline h-4 w-4 mx-1" /> na parte inferior da tela
        </p>
      </div>
    </div>

    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
        2
      </div>
      <div className="flex-1">
        <p className="font-medium">Selecione "Adicionar à Tela de Início"</p>
        <p className="text-sm text-muted-foreground">
          Role para baixo e encontre a opção no menu
        </p>
      </div>
    </div>

    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
        3
      </div>
      <div className="flex-1">
        <p className="font-medium">Confirme a instalação</p>
        <p className="text-sm text-muted-foreground">
          Confirme o nome do app e toque em "Adicionar"
        </p>
      </div>
    </div>
  </div>
);

const DesktopInstructions = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
        1
      </div>
      <div className="flex-1">
        <p className="font-medium">Procure pelo ícone de instalação</p>
        <p className="text-sm text-muted-foreground">
          Clique no ícone <Download className="inline h-4 w-4 mx-1" /> na barra de endereços
        </p>
      </div>
    </div>

    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
        2
      </div>
      <div className="flex-1">
        <p className="font-medium">Ou use o menu do navegador</p>
        <p className="text-sm text-muted-foreground">
          Menu <MoreVertical className="inline h-4 w-4 mx-1" /> → "Instalar BeeWise..."
        </p>
      </div>
    </div>

    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
        3
      </div>
      <div className="flex-1">
        <p className="font-medium">Confirme a instalação</p>
        <p className="text-sm text-muted-foreground">
          Clique em "Instalar" na caixa de diálogo
        </p>
      </div>
    </div>
  </div>
);

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  deviceType,
  onMarkAsShownInSession,
  onDisablePermanently,
}) => {
  const handleGotIt = () => {
    onMarkAsShownInSession();
    onClose();
  };

  const handleLater = () => {
    onMarkAsShownInSession();
    onClose();
  };

  const handleDontShowAgain = async () => {
    await onDisablePermanently();
    onClose();
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'android':
      case 'ios':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
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

  const renderInstructions = () => {
    switch (deviceType) {
      case 'android':
        return <AndroidInstructions />;
      case 'ios':
        return <IOSInstructions />;
      default:
        return <DesktopInstructions />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Instalar BeeWise</DialogTitle>
              <DialogDescription>
                Adicione o app à sua tela inicial para acesso rápido
              </DialogDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-2">
              {getDeviceIcon()}
              {getDeviceLabel()}
            </Badge>
            <Badge variant="secondary" className="gap-2">
              <CheckCircle className="h-3 w-3" />
              Funciona offline
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Por que instalar?</p>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Acesso rápido da tela inicial</li>
              <li>• Funciona mesmo sem internet</li>
              <li>• Experiência como app nativo</li>
              <li>• Notificações em tempo real</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Como instalar:</h3>
            {renderInstructions()}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGotIt} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Entendi!
            </Button>
            <Button variant="outline" onClick={handleLater} className="flex-1">
              Mais tarde
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={handleDontShowAgain}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Não mostrar mais
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};