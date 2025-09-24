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

  // Se tem assinatura ativa, sempre permitir acesso (mesmo sem email confirmado)
  if (hasActive) {
    // Se está na página de assinar, redirecionar para dashboard
    if (path === '/assinar' || path.startsWith('/assinatura-')) {
      return <Navigate to="/dashboard" replace />;
    }
    // Permitir acesso a todas as áreas protegidas
    return <>{children}</>;
  }

  // Verificar email confirmado apenas se não tem assinatura ativa
  const emailConfirmed = user?.email_confirmed_at !== null;
  if (!emailConfirmed) {
    return <Navigate to="/assinar" replace />;
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