import { getFreemiumConfig } from '@/config/freemium';

export const FreemiumStatus = () => {
  const config = getFreemiumConfig();
  
  if (!config.freemium_mode) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
        Modo Freemium Ativo
      </div>
    </div>
  );
};