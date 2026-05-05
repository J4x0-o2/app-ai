import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/authContext';

interface Props {
    allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<Props> = ({ allowedRoles }) => {
    const { isAuthenticated, isInitialized, user } = useAuth();

    if (!isInitialized) {
        return null;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/chat" replace />;
    }

    return <Outlet />;
};
