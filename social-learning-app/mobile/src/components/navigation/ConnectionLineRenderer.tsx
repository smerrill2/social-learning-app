import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { ConnectionLine } from '../../types/navigationTypes';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  connections: ConnectionLine[];
  screenOffset: Animated.AnimatedAddition;
  containerWidth?: number; // total width of all pages
}

export const ConnectionLineRenderer: React.FC<Props> = ({ connections, screenOffset, containerWidth }) => {
  const pathAnimations = useRef<{ [key: string]: Animated.Value }>({});

  // Initialize animations for each connection
  useEffect(() => {
    const map = pathAnimations.current;
    connections.forEach(c => {
      if (!map[c.id]) map[c.id] = new Animated.Value(0);
    });
    // Clean up animations for removed connections
    Object.keys(map).forEach(id => {
      if (!connections.find(c => c.id === id)) delete map[id];
    });
  }, [connections]);

  const animateConnection = (connectionId: string) => {
    const animation = pathAnimations.current[connectionId];
    if (animation) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false, // SVG props do not support native driver
      }).start();
    }
  };

  // Right-angle path with rounded corners. Works for any relative placement.
  const createPath = (fromX: number, fromY: number, toX: number, toY: number) => {
    const r = 20;
    const goingDown = toY >= fromY;
    const sign = goingDown ? 1 : -1;
    const midY = fromY + sign * 40; // bend after 40px vertically

    return [
      `M ${fromX},${fromY}`,
      `L ${fromX},${midY - sign * r}`,
      `Q ${fromX},${midY} ${fromX + r},${midY}`,
      `L ${toX - r},${midY}`,
      `Q ${toX},${midY} ${toX},${midY + sign * r}`,
      `L ${toX},${toY}`,
    ].join(' ');
  };

  // Trigger animations when connections become active
  useEffect(() => {
    connections.forEach(connection => {
      if (connection.isActive) {
        setTimeout(() => animateConnection(connection.id), 300);
      }
    });
  }, [connections]);

  const totalWidth = useMemo(() => containerWidth ?? SCREEN_WIDTH * Math.max(1, connections.length + 1), [containerWidth, connections.length]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: screenOffset }] }]}
    >
      <Svg width={totalWidth} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFillObject}>
        <Defs>
          {connections.map(c => (
            <LinearGradient key={c.id} id={`gradient-${c.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="rgba(4, 219, 235, 0.8)" stopOpacity="0.8" />
              <Stop offset="50%" stopColor="rgba(4, 219, 235, 1)" stopOpacity="1" />
              <Stop offset="100%" stopColor="rgba(4, 219, 235, 0.6)" stopOpacity="0.6" />
            </LinearGradient>
          ))}
        </Defs>

        {connections.map((connection) => {
          const animation = pathAnimations.current[connection.id];
          if (!animation) return null;

          const pathData = createPath(connection.from.x, connection.from.y, connection.to.x, connection.to.y);

          return (
            <>
              <AnimatedPath
                key={`path-${connection.id}`}
                d={pathData}
                stroke={`url(#gradient-${connection.id})`}
                strokeWidth="3"
                strokeDasharray="8,4"
                strokeDashoffset={animation.interpolate({ inputRange: [0, 1], outputRange: [200, 0] })}
                fill="transparent"
                strokeLinecap="round"
              />
              <AnimatedCircle
                key={`dot-${connection.id}`}
                cx={connection.to.x}
                cy={connection.to.y}
                r={animation.interpolate({ inputRange: [0, 1], outputRange: [0, 6] })}
                fill="rgb(4, 219, 235)"
                opacity={animation.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 0.8, 1] })}
              />
            </>
          );
        })}
      </Svg>
    </Animated.View>
  );
};

export default ConnectionLineRenderer;
