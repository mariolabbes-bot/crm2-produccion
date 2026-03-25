import React from 'react';
import DashboardNuevo from '../components/DashboardNuevo';
import MobileHomePage from './MobileHomePage';
import MobileManagerDashboard from './MobileManagerDashboard';
import useIsMobile from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const isMobile = useIsMobile();
  const { isManager } = useAuth();

  if (isMobile) {
    return isManager() ? <MobileManagerDashboard /> : <MobileHomePage />;
  }

  return <DashboardNuevo />;
};

export default DashboardPage;
