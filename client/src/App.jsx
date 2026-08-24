import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

// pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import PlaceOrder from './pages/PlaceOrder';
import OrdersList from './pages/OrdersList';
import OrderDetail from './pages/OrderDetail';
import ZoneManager from './pages/admin/ZoneManager';
import RateCards from './pages/admin/RateCards';
import AgentsPage from './pages/admin/AgentsPage';

// redirect logged-in users away from auth pages
function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner"></div></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={
            <AuthRoute><Login /></AuthRoute>
          } />
          <Route path="/register" element={
            <AuthRoute><Register /></AuthRoute>
          } />

          {/* Protected routes - all roles */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute><OrdersList /></ProtectedRoute>
          } />
          <Route path="/orders/:id" element={
            <ProtectedRoute><OrderDetail /></ProtectedRoute>
          } />

          {/* Customer & Admin can place orders */}
          <Route path="/place-order" element={
            <ProtectedRoute roles={['customer', 'admin']}><PlaceOrder /></ProtectedRoute>
          } />

          {/* Admin-only routes */}
          <Route path="/zones" element={
            <ProtectedRoute roles={['admin']}><ZoneManager /></ProtectedRoute>
          } />
          <Route path="/rate-cards" element={
            <ProtectedRoute roles={['admin']}><RateCards /></ProtectedRoute>
          } />
          <Route path="/agents" element={
            <ProtectedRoute roles={['admin']}><AgentsPage /></ProtectedRoute>
          } />

          {/* Redirect root to dashboard or login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
