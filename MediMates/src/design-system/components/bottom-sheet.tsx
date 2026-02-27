/**
 * AppBottomSheet — @gorhom/bottom-sheet wrapper with app styling
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetProps,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useColors } from '../theme-provider';
import { radii, spacing } from '../tokens';

interface AppBottomSheetProps extends Partial<BottomSheetProps> {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
}

export const AppBottomSheet = forwardRef<BottomSheet, AppBottomSheetProps>(
  function AppBottomSheet(
    { children, snapPoints: customSnapPoints, ...rest },
    ref,
  ) {
    const c = useColors();

    const snapPoints = useMemo(
      () => customSnapPoints ?? ['50%', '90%'],
      [customSnapPoints],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.25}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={[
          styles.handleIndicator,
          { backgroundColor: c.textTertiary },
        ]}
        backgroundStyle={[
          styles.background,
          { backgroundColor: c.card },
        ]}
        style={styles.sheet}
        {...rest}
      >
        <BottomSheetView style={styles.content}>
          {children}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  sheet: {
    zIndex: 100,
  },
  background: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
  },
  handleIndicator: {
    width: 36,
    height: 5,
    borderRadius: 3,
    opacity: 0.4,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
});
