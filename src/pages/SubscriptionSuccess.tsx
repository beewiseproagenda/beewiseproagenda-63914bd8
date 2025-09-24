import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FREEMIUM_MODE } from '@/config/freemium';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // FREEMIUM MODE: Always redirect to dashboard
    if (FREEMIUM_MODE) {
      navigate('/dashboard', { replace: true });
      return;
    }
    
    // Original behavior (temporarily disabled for freemium testing)
    window.location.replace('/dashboard');
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <a href="/dashboard" className="text-primary hover:underline">Ir para o Dashboard</a>
    </div>
  );
};

export default SubscriptionSuccess;