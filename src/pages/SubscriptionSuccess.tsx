import { useEffect } from 'react';

const SubscriptionSuccess = () => {
  useEffect(() => {
    window.location.replace('/dashboard');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <a href="/dashboard" className="text-primary hover:underline">Ir para o Dashboard</a>
    </div>
  );
};

export default SubscriptionSuccess;