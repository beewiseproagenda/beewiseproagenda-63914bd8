import { Navigate, useLocation } from 'react-router-dom';
import { useAuthAndSubscription } from '@/hooks/useAuthAndSubscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, subscription } = useAuthAndSubscription();
  const location = useLocation();

  // Enquanto carrega, não redireciona
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar email confirmado
  const emailConfirmed = user.email_confirmed_at !== null;
  if (!emailConfirmed) {
    return <Navigate to="/assinar" replace />;
  }

  const isSuccessPage = location.pathname.startsWith('/assinatura/sucesso');
  const isDashboard = location.pathname.startsWith('/dashboard');

  // Se ativo e está preso na página de "assinatura sucesso", manda para dashboard
  if (subscription.active && isSuccessPage) {
    return <Navigate to="/dashboard" replace />;
  }

  // Se NÃO ativo e tentou abrir dashboard, manda para /assinar
  if (!subscription.active && isDashboard) {
    return <Navigate to="/assinar" replace />;
  }

  // Se não tem assinatura ativa, redirecionar para assinar (exceto páginas específicas)
  if (!subscription.active && !isSuccessPage && !location.pathname.startsWith('/assinar') && 
      !location.pathname.startsWith('/assinatura/retorno') && !location.pathname.startsWith('/payment/return')) {
    return <Navigate to="/assinar" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;