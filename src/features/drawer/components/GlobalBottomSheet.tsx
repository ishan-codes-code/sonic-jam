import React, { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useDrawerStore } from '../store/drawerStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BottomSheetWithLayout = BottomSheet as unknown as React.ComponentType<
  React.ComponentProps<typeof BottomSheet> & { onLayout?: () => void }
>;

export const GlobalBottomSheet = () => {
  const sheetRef = useRef<BottomSheet>(null);
  const isMounted = useRef(false);
  const { content, snapPoint, close, isOpen } = useDrawerStore();

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    if (isOpen) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen, snapPoint]);

  // Handle hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (isOpen) {
        close();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isOpen, close]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      close();
    }
  }, [close]);

  return (
    <BottomSheetWithLayout
      ref={sheetRef}
      index={-1}
      onLayout={() => {
        isMounted.current = true;
      }}
      containerStyle={{ zIndex: 9999, elevation: 9999 }}
      snapPoints={snapPoint !== undefined ? (Array.isArray(snapPoint) ? snapPoint : [snapPoint]) : undefined}
      enableDynamicSizing={snapPoint === undefined}
      maxDynamicContentSize={SCREEN_HEIGHT * 0.9}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: "#0a0a0a" }}
      handleIndicatorStyle={{ backgroundColor: "#a1a1aa" }}
      backdropComponent={renderBackdrop}
      animationConfigs={{
        damping: 32,
        stiffness: 300,
        mass: 0.5,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      } as unknown as React.ComponentProps<typeof BottomSheet>['animationConfigs']}
      onChange={handleSheetChange}
    >
      {snapPoint === undefined ? (
        <BottomSheetView>
          {content}
        </BottomSheetView>
      ) : (
        content
      )}
    </BottomSheetWithLayout>
  );
};
