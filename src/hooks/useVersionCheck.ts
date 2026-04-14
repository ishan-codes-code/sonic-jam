import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { checkAppVersion } from '../services/versionService';
import { useVersionStore } from '../store/versionStore';

export const useVersionCheck = () => {
  const setVersionState = useVersionStore((s) => s.setVersionState);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const runCheck = async () => {
      const result = await checkAppVersion();
      setVersionState(result);
    };

    runCheck();

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          runCheck();
        }
        appState.current = nextState;
      }
    );

    return () => subscription.remove();
  }, []);
};
