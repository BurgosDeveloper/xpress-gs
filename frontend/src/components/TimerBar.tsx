import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface TimerBarProps {
  durationMs: number;
  onExpire?: () => void;
}

export const TimerBar: React.FC<TimerBarProps> = ({ durationMs, onExpire }) => {
  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(
      0,
      {
        duration: durationMs,
        easing: Easing.linear,
      },
      (finished) => {
        if (finished && onExpire) {
          runOnJS(onExpire)();
        }
      }
    );
  }, [durationMs]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
      backgroundColor: progress.value > 0.3 ? colors.neon : colors.danger,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, animatedStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
    shadowColor: colors.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
});
