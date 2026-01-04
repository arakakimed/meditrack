import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute'; // Ajuste se for export default ou { ProtectedRoute }
import Login from './components/Login';
import Unauthorized from './components/Unauthorized';
import AdminPanel from './components/AdminPanel';
import PatientPanel from './components/PatientPanel';

const App: React.FC = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Rotas Públicas */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    {/* ROTA ADMIN (Só Admin entra) */}
                    <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                        <Route path="/admin/*" element={<AdminPanel />} />
                    </Route>

                    {/* ROTA STAFF (Staff e Admin entram) */}
                    {/* IMPORTANTE: Aqui carregamos o AdminPanel DIRETO, sem redirecionar para /admin */}
                    <Route element={<ProtectedRoute allowedRoles={['Staff', 'Admin']} />}>
                        <Route path="/staff/*" element={<AdminPanel />} />
                    </Route>

                    {/* ROTA PACIENTE */}
                    <Route element={<ProtectedRoute allowedRoles={['Patient']} />}>
                        <Route path="/patient" element={<PatientPanel />} />
                    </Route>

                    {/* Redirecionamentos */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;