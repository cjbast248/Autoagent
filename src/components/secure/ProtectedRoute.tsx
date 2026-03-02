import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * PATCH #01: ProtectedRoute - защита маршрутов кабинета
 *
 * Этот компонент гарантирует что:
 * 1. Неавторизованные пользователи не могут видеть кабинет
 * 2. После logout пользователь всегда уходит на /auth
 * 3. Нет "фантомных" состояний когда user=null но UI показывает кабинет
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Показываем загрузку пока проверяется сессия
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Если нет пользователя - редирект на авторизацию
  // Сохраняем текущий путь чтобы вернуть пользователя после логина
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Пользователь авторизован - показываем контент
  return <>{children}</>;
};

export default ProtectedRoute;
