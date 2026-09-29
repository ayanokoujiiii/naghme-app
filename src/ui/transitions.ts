import { Animated, Easing } from 'react-native';
import type { StackCardInterpolationProps, StackNavigationOptions } from '@react-navigation/stack';

/**
 * Screen transitions.
 * pageTurn: like a Persian book, which opens from the right. The new screen
 * swings in around the right-hand spine; the old one sinks back into shadow.
 * Going back turns the page the other way.
 */
function pageTurn({ current, next, layouts }: StackCardInterpolationProps) {
  const w = layouts.screen.width;
  const p = current.progress;
  const n = next ? next.progress : new Animated.Value(0);
  return {
    cardStyle: {
      backfaceVisibility: 'hidden' as const,
      opacity: p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
      transform: [
        { perspective: 1600 },
        { translateX: w / 2 },
        { rotateY: p.interpolate({ inputRange: [0, 1], outputRange: ['72deg', '0deg'] }) },
        { translateX: -w / 2 },
        { scale: n.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
        { translateX: n.interpolate({ inputRange: [0, 1], outputRange: [0, w * 0.08] }) },
      ],
    },
    overlayStyle: {
      backgroundColor: '#050403',
      opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.65] }),
    },
  };
}

/** The player rises from the mini player like a curtain being lifted. */
function rise({ current, layouts }: StackCardInterpolationProps) {
  const h = layouts.screen.height;
  const p = current.progress;
  return {
    cardStyle: {
      opacity: p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
      transform: [
        { perspective: 1400 },
        { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [h * 0.6, 0] }) },
        { rotateX: p.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '0deg'] }) },
        { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
      ],
      borderRadius: p.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
      overflow: 'hidden' as const,
    },
    overlayStyle: { backgroundColor: '#000', opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) },
  };
}

function fadeOnly({ current }: StackCardInterpolationProps) {
  return { cardStyle: { opacity: current.progress } };
}

const ease = Easing.bezier(0.22, 0.9, 0.24, 1);

export const pageOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: '#0B0B0C' },
  cardOverlayEnabled: true,
  gestureEnabled: true,
  gestureDirection: 'horizontal-inverted',
  cardStyleInterpolator: pageTurn,
  transitionSpec: {
    open: { animation: 'timing', config: { duration: 620, easing: ease } },
    close: { animation: 'timing', config: { duration: 480, easing: Easing.inOut(Easing.cubic) } },
  },
};

export const riseOptions: StackNavigationOptions = {
  presentation: 'modal',
  gestureEnabled: true,
  gestureDirection: 'vertical',
  cardOverlayEnabled: true,
  cardStyleInterpolator: rise,
  transitionSpec: {
    open: { animation: 'spring', config: { damping: 22, stiffness: 160, mass: 1 } },
    close: { animation: 'timing', config: { duration: 380, easing: Easing.in(Easing.cubic) } },
  },
};

export const overlayOptions: StackNavigationOptions = {
  presentation: 'transparentModal',
  cardStyle: { backgroundColor: 'transparent' },
  cardOverlayEnabled: false,
  gestureEnabled: false,
  cardStyleInterpolator: fadeOnly,
  transitionSpec: {
    open: { animation: 'timing', config: { duration: 220 } },
    close: { animation: 'timing', config: { duration: 200 } },
  },
};

export const tabsOptions: StackNavigationOptions = { cardStyleInterpolator: fadeOnly };
