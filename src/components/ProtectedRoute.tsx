import { Navigate, useLocation } from 'react-router-dom';
import { useAuthAndSubscription } from '@/hooks/useAuthAndSubscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { status, isAuthenticated, hasActive, user } = useAuthAndSubscription();
  const location = useLocation();
  const path = location.pathname;

  // Enquanto carrega NADA de redirecionar (evita loop)
  if (status !== 'ready') {
    return <>{children}</>;
  }

  // Não autenticado → login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: path }} />;
  }

  // Verificar email confirmado
  const emailConfirmed = user?.email_confirmed_at !== null;
  if (!emailConfirmed) {
    return <Navigate to="/assinar" replace />;
  }

  // Já tem assinatura e está na página de assinar → vá ao dashboard
  if (hasActive && path === '/assinar') {
    return <Navigate to="/dashboard" replace />;
  }

  // Não tem assinatura e quer usar área protegida → vá para assinar
  const needsSub = path.startsWith('/dashboard') || 
                   path.startsWith('/clientes') || 
                   path.startsWith('/financeiro') ||
                   path.startsWith('/agenda') ||
                   path.startsWith('/relatorios') ||
                   path.startsWith('/cadastros');
                   
  if (!hasActive && needsSub) {
    return <Navigate to="/assinar" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;