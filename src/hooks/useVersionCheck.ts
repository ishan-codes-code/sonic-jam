import { useEffect } from 'react';
import { checkAppVersion } from '../services/versionService';
import { useVersionStore } from '../store/versionStore';

export const useVersionCheck = () => {
  const setVersionState = useVersionStore((s) => s.setVersionState);

  useEffect(() => {
    const init = async () => {
      const result = await checkAppVersion();
      setVersionState(result);
    };

    init();
  }, [setVersionState]);
};
