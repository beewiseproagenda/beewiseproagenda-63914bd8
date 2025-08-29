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

  // Aguardar TODOS os loadings terminarem antes de tomar qualquer decisão
  const isLoading = loading || subscriptionLoading;
  
  console.log('[ProtectedRoute] Estado atual:', { 
    authLoading: loading,
    subscriptionLoading,
    isLoading,
    hasUser: !!user,
    userEmail: user?.email,
    emailConfirmed: user?.email_confirmed_at !== null,
    subscriptionStatus: currentSubscription?.status,
    isActiveSubscription,
    currentPath: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  // Mostrar loading enquanto qualquer estado estiver carregando
  if (isLoading) {
    console.log('[ProtectedRoute] Ainda carregando, exibindo spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Verificar autenticação básica
  if (!user) {
    console.log('[ProtectedRoute] Usuário não autenticado, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  // Verificar email confirmado
  const emailConfirmed = user.email_confirmed_at !== null;
  if (!emailConfirmed) {
    console.log('[ProtectedRoute] Email não confirmado, redirecionando para assinatura');
    return <Navigate to="/assinar" replace />;
  }

  // Verificar assinatura ativa
  if (!isActiveSubscription) {
    console.log('[ProtectedRoute] Assinatura não ativa:', { 
      currentSubscription: currentSubscription?.status,
      isActiveSubscription 
    });
    return <Navigate to="/assinar" replace />;
  }

  console.log('[ProtectedRoute] Todas as verificações passaram, permitindo acesso');
  return <>{children}</>;
};

export default ProtectedRoute;