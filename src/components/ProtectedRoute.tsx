import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { currentSubscription, loading: subscriptionLoading, isActiveSubscription } = useSubscription();

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Gate de acesso: verificar email confirmado e assinatura ativa
  const emailConfirmed = user.email_confirmed_at !== null;
  
  console.log('[ProtectedRoute] Debug:', { 
    emailConfirmed, 
    isActiveSubscription, 
    currentSubscription: currentSubscription?.status,
    shouldRedirect: !emailConfirmed || !isActiveSubscription 
  });
  
  if (!emailConfirmed || !isActiveSubscription) {
    return <Navigate to="/assinar" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;