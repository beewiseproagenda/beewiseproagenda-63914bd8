import { Badge } from '@/components/ui/badge';
import { Smartphone, Wifi, WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useEffect, useState } from 'react';

export const PWAStatus = () => {
  const { isInstalled, isStandalone } = usePWA();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isInstalled && !isStandalone) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
        <Smartphone className="h-3 w-3" />
        Aplicativo
      </Badge>
      
      <Badge 
        variant={isOnline ? "default" : "destructive"} 
        className="flex items-center gap-1 text-xs"
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>
    </div>
  );
};