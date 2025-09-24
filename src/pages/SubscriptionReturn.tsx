import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FREEMIUM_MODE } from '@/config/freemium';

const SubscriptionReturn = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // FREEMIUM MODE: Always redirect to dashboard
    // Temporarily disabled for freemium testing
    if (FREEMIUM_MODE) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Original payment processing logic would be here
    // Hard redirect for now
    window.location.replace('/dashboard');
  }, [navigate]);

  return null;
};

export default SubscriptionReturn;