import { useDrawerStore } from '../store/drawerStore';

/**
 * Hook to interact with the global bottom sheet/drawer.
 */
export const useBottomSheet = () => {
  const { open, close } = useDrawerStore();
  return { open, close };
};
