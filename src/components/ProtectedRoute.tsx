import { Navigate, useLocation } from 'react-router-dom';
import { useAuthAndSubscription } from '@/hooks/useAuthAndSubscription';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PaywallOverlay } from '@/components/PaywallOverlay';
import { redirectToDashboard } from '@/lib/forceRedirect';
import { FREEMIUM_MODE } from '@/config/freemium';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { loading, user, subscriptionStatus, trial } = useAuthAndSubscription();
  const location = useLocation();
  const path = location.pathname;

  // Enquanto carrega, mostrar loading
  if (loading) {
    return <>{children}</>;
  }

  // Não autenticado → login (hard redirect)
  if (!user) {
    window.location.replace('/login');
    return null;
  }

  // FREEMIUM MODE: Skip all subscription checks, only verify authentication
  if (FREEMIUM_MODE) {
    // Redirect subscription-related pages to dashboard
    if (path === '/assinar' || 
        path.startsWith('/assinatura-') || 
        path.startsWith('/assinatura/') ||
        path.startsWith('/subscription/') ||
        path === '/payment/return' ||
        path === '/subscription-success' ||
        path === '/minha-assinatura') {
      window.location.replace('/dashboard');
      return null;
    }
    // Allow access to all areas for authenticated users
    return <>{children}</>;
  }

  // ORIGINAL SUBSCRIPTION LOGIC (disabled when FREEMIUM_MODE=true)
  // Se tem assinatura ativa, sempre permitir acesso
  if (subscriptionStatus === 'active') {
    // Se está em qualquer página de assinatura, hard redirect para dashboard
    if (path === '/assinar' || 
        path.startsWith('/assinatura-') || 
        path.startsWith('/assinatura/') ||
        path.startsWith('/subscription/') ||
        path === '/payment/return' ||
        path === '/subscription-success') {
      window.location.replace('/dashboard');
      return null;
    }
    // Permitir acesso a todas as áreas protegidas
    return <>{children}</>;
  }

  // Verificar se trial ainda é válido
  const trialValid = !trial.expired;
  
  // Se trial válido, permitir acesso
  if (trialValid) {
    return <>{children}</>;
  }

  // Trial expirado e sem assinatura - mostrar overlay de bloqueio
  const needsSub = path.startsWith('/dashboard') || 
                   path.startsWith('/clientes') || 
                   path.startsWith('/financeiro') ||
                   path.startsWith('/agenda') ||
                   path.startsWith('/relatorios') ||
                   path.startsWith('/cadastros');
                   
  if (needsSub && subscriptionStatus !== 'active' && trial.expired) {
    return (
      <>
        {children}
        <PaywallOverlay isOpen={true} trialDays={7} />
      </>
    );
  }

  // Para outras páginas não protegidas, verificar email confirmado
  const emailConfirmed = user?.email_confirmed_at !== null;
  if (!emailConfirmed) {
    return <Navigate to="/assinar" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;