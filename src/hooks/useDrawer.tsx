import { theme } from '@/src/theme';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { BackHandler, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');


type BottomSheetContextType = {
    open: (content: React.ReactNode, snapPoints?: string[]) => void;
    close: () => void;
};

const BottomSheetContext = createContext<BottomSheetContextType | null>(null);

export const BottomSheetProvider = ({ children }: { children: React.ReactNode }) => {
    const sheetRef = useRef<BottomSheet>(null);

    const [isOpen, setIsOpen] = useState(false);

    const [content, setContent] = useState<React.ReactNode>(null);
    const [snapPoints, setSnapPoints] = useState<string[] | undefined>(undefined);

    const open = useCallback((node: React.ReactNode, points?: string[]) => {
        setContent(node);
        setSnapPoints(points);
        // snap to middle (index 1) if there are 3 snap points, otherwise first snap point
        const initialIndex = points && points.length >= 3 ? 1 : 0;
        // Defer snapToIndex so BottomSheet has time to complete its layout pass with new snapPoints
        requestAnimationFrame(() => {
            setTimeout(() => {
                sheetRef.current?.snapToIndex(initialIndex);
            }, 50);
        });
    }, []);

    const close = useCallback(() => {
        sheetRef.current?.close();
    }, []);

    const value = useMemo(() => ({ open, close }), [open, close]);


    useEffect(() => {
        const onBackPress = () => {
            if (isOpen) {
                sheetRef.current?.close();
                return true; // 🚨 stop navigation
            }
            return false; // allow normal back
        };

        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress
        );

        return () => subscription.remove();
    }, [isOpen]);


    return (
        <BottomSheetContext.Provider value={value}>
            {children}

            {/* GLOBAL SHEET */}
            <BottomSheet
                ref={sheetRef}
                index={-1}
                snapPoints={snapPoints}
                enableDynamicSizing={!snapPoints || snapPoints.length === 0}
                maxDynamicContentSize={SCREEN_HEIGHT * 0.9}
                enablePanDownToClose
                keyboardBehavior="interactive"
                backgroundStyle={{ backgroundColor: theme.colors.backgroundCard }}
                handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
                backdropComponent={useCallback(
                    (props: any) => (
                        <BottomSheetBackdrop
                            {...props}
                            disappearsOnIndex={-1}
                            appearsOnIndex={0}
                            opacity={0.6}
                        />
                    ),
                    []
                )}
                onChange={(index) => {
                    setIsOpen(index >= 0);
                }}
            >
                {(!snapPoints || snapPoints.length === 0) ? (
                    <BottomSheetView>
                        {content}
                    </BottomSheetView>
                ) : (
                    content
                )}
            </BottomSheet>
        </BottomSheetContext.Provider>
    );
};

export const useBottomSheet = () => {
    const context = useContext(BottomSheetContext);
    if (!context) {
        throw new Error('useBottomSheet must be used within BottomSheetProvider');
    }
    return context;
};