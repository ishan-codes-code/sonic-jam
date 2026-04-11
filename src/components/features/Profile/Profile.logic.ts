import { useAuth } from '../../../hooks/useAuth';

export const useProfileLogic = () => {
  const { logout, user } = useAuth();

  return {
    user,
    logout,
  };
};
