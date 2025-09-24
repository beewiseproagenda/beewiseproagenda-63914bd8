import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          window.location.replace('/login?error=confirm');
          return;
        }

        // Check if we have a valid session
        if (data.session?.user) {
          // Hard redirect to dashboard
          window.location.replace('/dashboard');
        } else {
          // No valid session, hard redirect to login
          window.location.replace('/login?error=confirm');
        }
      } catch (error) {
        console.error('Callback processing error:', error);
        window.location.replace('/login?error=confirm');
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground">Confirmando seu e-mail...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;