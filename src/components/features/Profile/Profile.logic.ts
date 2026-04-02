import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';

export const useProfileLogic = () => {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [losslessEnabled, setLosslessEnabled] = useState(true);
  const [dataSaverEnabled, setDataSaverEnabled] = useState(false);

  const handleDemoFlash = () => {
    router.push('/(tabs)/explore');
  };

  return {
    user,
    logout,
    losslessEnabled,
    setLosslessEnabled,
    dataSaverEnabled,
    setDataSaverEnabled,
    handleDemoFlash,
  };
};
