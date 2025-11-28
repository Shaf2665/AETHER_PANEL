import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import EarnCoins from './pages/EarnCoins';
import Store from './pages/Store';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';

// Components
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';

// Auth context
import { useAuth } from './contexts/AuthContext';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <div className="flex">
                    <Sidebar />
                    <div className="flex-1 flex flex-col">
                      <Navbar />
                      <main className="flex-1 p-6">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/servers" element={<Servers />} />
                          <Route path="/earn" element={<EarnCoins />} />
                          <Route path="/store" element={<Store />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </PrivateRoute>
              }
            />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

