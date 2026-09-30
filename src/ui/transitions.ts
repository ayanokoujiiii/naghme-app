import { Animated, Easing } from 'react-native';
import type { StackCardInterpolationProps, StackNavigationOptions } from '@react-navigation/stack';

/**
 * Screen transitions.
 * pageTurn: like a Persian book, which opens from the right. The new screen
 * swings in around the right-hand spine; the old one sinks back into shadow.
 * Going back turns the page the other way.
 */
function pageTurn({ current, next, layouts }: StackCardInterpolationProps) {
  // v1.1: a light page turn. Only opacity + transforms, no 3D perspective on the
  // whole screen (that was the main cause of slow, stuttering transitions).
  const w = layouts.screen.width;
  const p = current.progress;
  const n = next ? next.progress : new Animated.Value(0);
  return {
    cardStyle: {
      opacity: p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
      transform: [
        { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.22, 0] }) },
        { scale: n.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) },
      ],
    },
    overlayStyle: {
      backgroundColor: '#050403',
      opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
    },
  };
}

/** The player rises from the mini player like a curtain being lifted. */
function rise({ current, layouts }: StackCardInterpolationProps) {
  const h = layouts.screen.height;
  const p = current.progress;
  return {
    cardStyle: {
      opacity: p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
      transform: [
        { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [h * 0.5, 0] }) },
        { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      ],
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
    open: { animation: 'timing', config: { duration: 340, easing: ease } },
    close: { animation: 'timing', config: { duration: 260, easing: Easing.out(Easing.cubic) } },
  },
};

export const riseOptions: StackNavigationOptions = {
  presentation: 'modal',
  gestureEnabled: true,
  gestureDirection: 'vertical',
  cardOverlayEnabled: true,
  cardStyleInterpolator: rise,
  transitionSpec: {
    open: { animation: 'timing', config: { duration: 380, easing: ease } },
    close: { animation: 'timing', config: { duration: 280, easing: Easing.in(Easing.cubic) } },
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
