import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface PWAUpdateBannerProps {
  version?: string;
  onUpdate?: () => void;
}

export const PWAUpdateBanner: React.FC<PWAUpdateBannerProps> = ({ version, onUpdate }) => {
  const handleUpdate = () => {
    console.log('[BW][PWA_UPDATE] User triggered manual update');
    if (onUpdate) {
      onUpdate();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[hsl(var(--bw-yellow))] text-[hsl(var(--bw-blue-dark))] shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Nova versão disponível!</p>
            {version && (
              <p className="text-xs opacity-80">Versão: {version}</p>
            )}
          </div>
        </div>
        <Button
          onClick={handleUpdate}
          size="sm"
          className="bg-[hsl(var(--bw-blue-dark))] text-white hover:bg-[hsl(var(--bw-blue-dark))]/90 flex-shrink-0"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>
    </div>
  );
};
