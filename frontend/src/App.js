import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import lubricarTheme from './theme/lubricarTheme';
import { PrivateRoute, ManagerRoute } from './components/RouteGuards';

// Components
import Login from './components/Login';
import Register from './components/Register';
import ActivityList from './components/ActivityList';
import ActivityDetail from './components/ActivityDetail';
import ActivityEditor from './components/ActivityEditor';
import Goals from './components/Goals';
import AdminManager from './components/AdminManager';
import DashboardNuevo from './components/DashboardNuevo';
import ImportPanel from './components/ImportPanel';
import MainLayout from './components/MainLayout';
import ClientManager from './components/ClientManager';
import VisitMapPoC from './components/VisitMapPoC';

// Pages
import DashboardPage from './pages/DashboardPage';
import ClientesPage from './pages/ClientesPage';
import ProductsPage from './pages/ProductsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import AssistantPage from './pages/AssistantPage';
import VentasPage from './pages/VentasPage';
import MobileVisitsPage from './pages/MobileVisitsPage';

// Styles
import './styles/layout.css';

import PlannerPage from './pages/PlannerPage';

import AssistantFloatingButton from './components/ai/AssistantFloatingButton';

// ... (imports)

const App = () => {
    return (
        <ThemeProvider theme={lubricarTheme}>
            <AuthProvider>
                <UIProvider>
                    <BrowserRouter>
                        <AssistantFloatingButton /> {/* Flotante global, el componente chequea auth internamente */}
                        <Routes>
                            <Route path="/login" element={<Login />} />

                            <Route path="/register" element={<ManagerRoute><Register /></ManagerRoute>} />

                            {/* Rutas con MainLayout (diseño moderno) */}
                            <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                                <Route index element={<DashboardPage />} />
                                <Route path="clientes" element={<ClientesPage />} />
                                <Route path="ventas" element={<VentasPage />} />
                                <Route path="productos" element={<ProductsPage />} />
                                <Route path="cliente/:rut" element={<ClientDetailPage />} />
                                <Route path="mapa-visitas" element={<MobileVisitsPage />} />
                                <Route path="planificar" element={<PlannerPage />} />
                                <Route path="assistant" element={<AssistantPage />} />
                            </Route>


                            {/* Rutas antiguas (mantener temporalmente por compatibilidad) */}
                            <Route path="/clients" element={<PrivateRoute><ClientManager /></PrivateRoute>} />
                            <Route path="/activities" element={<PrivateRoute><ActivityList /></PrivateRoute>} />
                            <Route path="/activities/new" element={<PrivateRoute><ActivityEditor /></PrivateRoute>} />
                            <Route path="/activities/:id" element={<PrivateRoute><ActivityDetail /></PrivateRoute>} />
                            <Route path="/goals" element={<PrivateRoute><Goals /></PrivateRoute>} />
                            <Route path="/admin" element={<ManagerRoute><AdminManager /></ManagerRoute>} />
                            <Route path="/import-data" element={<ManagerRoute><ImportPanel /></ManagerRoute>} />
                            <Route path="/dashboard-nuevo" element={<DashboardNuevo />} />

                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </BrowserRouter>
                </UIProvider>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
