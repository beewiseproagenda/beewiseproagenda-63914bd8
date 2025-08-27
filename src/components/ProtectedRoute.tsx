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
  const currentPath = window.location.pathname;
  
  console.log('[ProtectedRoute] Debug:', { 
    emailConfirmed, 
    isActiveSubscription, 
    currentSubscription: currentSubscription?.status,
    currentPath,
    shouldRedirect: !emailConfirmed || (!isActiveSubscription && currentPath !== '/assinar')
  });
  
  // Se email não confirmado, redirecionar para assinatura
  if (!emailConfirmed) {
    return <Navigate to="/assinar" replace />;
  }

  // Se não tem assinatura ativa E não está na página de assinatura, redirecionar
  if (!isActiveSubscription && currentPath !== '/assinar') {
    return <Navigate to="/assinar" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;