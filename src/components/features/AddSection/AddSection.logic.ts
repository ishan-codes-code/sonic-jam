import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExploreStore } from '../../../store/exploreStore';

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const useAddSectionLogic = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addSection } = useExploreStore();

  const [value, setValue] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [inputError, setInputError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!value.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setInputError('Keyword or YouTube URL is required');
      return;
    }

    setInputError('');
    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const isPlaylist = value.trim().startsWith('http') || /^PL[A-Za-z0-9_-]{10,}$/.test(value.trim());
    const finalTitle = customTitle.trim() || (isPlaylist ? 'My Playlist' : capitalize(value.trim()));

    await addSection({
      value: value.trim(),
      type: 'keyword',
      title: finalTitle,
      layout: 'horizontal',
      variant: 'large',
    });

    router.back();
  }, [value, customTitle, addSection, router]);

  const footerBottom = Math.max(insets.bottom, 16);

  return {
    router,
    value,
    setValue,
    customTitle,
    setCustomTitle,
    inputError,
    setInputError,
    isSubmitting,
    handleConfirm,
    footerBottom,
  };
};
