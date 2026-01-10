import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface FilofaxTab {
  id: string;
  label: string;
  color: string;
}

interface FilofaxViewProps {
  tabs: FilofaxTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  children: React.ReactNode[];
}

const TAB_WIDTH = Platform.OS === 'web' ? 48 : 24;
const FLIP_DURATION = 500;

function getPalerColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const factor = 0.35;
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);

  return `rgb(${newR}, ${newG}, ${newB})`;
}

export function FilofaxView({ tabs, activeIndex, onTabPress, children }: FilofaxViewProps) {
  const [flippedTabs, setFlippedTabs] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    // Update flipped tabs based on activeIndex (only on web)
    if (Platform.OS === 'web') {
      const newFlippedTabs = new Set<number>();
      for (let i = 0; i < activeIndex; i++) {
        newFlippedTabs.add(i);
      }
      setFlippedTabs(newFlippedTabs);
    }
  }, [activeIndex]);

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      {/* Left tabs column */}
      <View style={styles.leftTabsColumn}>
        {tabs.map((tab, index) => {
          const isFlipped = flippedTabs.has(index);
          const isActive = index === activeIndex;

          if (isFlipped && isWeb) return <View key={tab.id} style={styles.tabPlaceholder} />;

          return (
            <StaticTab
              key={tab.id}
              tab={tab}
              isActive={isActive}
              style={styles.tabLeft}
              onPress={() => onTabPress(index)}
            />
          );
        })}
      </View>

      {/* Page content area */}
      <View style={[styles.pageArea, !isWeb && styles.pageAreaMobile]}>
        {tabs.map((tab, index) => {
          // On mobile, we don't use the flip animation logic for visibility.
          // Instead, we simply only render the active tab's page.
          if (!isWeb && index !== activeIndex) return null;

          return (
            <FlippablePage
              key={tab.id}
              index={index}
              totalTabs={tabs.length}
              isFlipped={flippedTabs.has(index)}
              onFlipComplete={() => {
                // Tab appears on right side after page flip completes (only on web)
                if (isWeb) {
                  setFlippedTabs(prev => new Set([...prev, index]));
                }
              }}
              onFlipStart={() => {
                // Tab disappears from left side when page flip starts (only on web)
                if (isWeb) {
                  setFlippedTabs(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(index);
                    return newSet;
                  });
                }
              }}
            >
              {children[index]}
            </FlippablePage>
          );
        })}
      </View>

      {/* Right tabs column - only on web */}
      {isWeb && (
        <View style={styles.rightTabsColumn}>
          {tabs.map((tab, index) => {
            const isFlipped = flippedTabs.has(index);

            if (!isFlipped) return <View key={tab.id} style={styles.tabPlaceholder} />;

            return (
              <StaticTab
                key={tab.id}
                tab={tab}
                isActive={false}
                style={styles.tabRight}
                onPress={() => onTabPress(index)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

interface AnimatedTabProps {
  tab: FilofaxTab;
  isActive: boolean;
  isVisible: boolean;
  style: any;
  onPress: () => void;
  delay: number;
}

interface StaticTabProps {
  tab: FilofaxTab;
  isActive: boolean;
  style: any;
  onPress: () => void;
}

function StaticTab({ tab, isActive, style, onPress }: StaticTabProps) {
  const tabColor = isActive ? tab.color : getPalerColor(tab.color);

  return (
    <View style={[styles.tab, style, { backgroundColor: tabColor }]}>
      <Pressable style={styles.tabPressable} onPress={onPress}>
        <View style={styles.tabTextWrapper}>
          <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function AnimatedTab({ tab, isActive, isVisible, style, onPress, delay }: AnimatedTabProps) {
  const opacity = useSharedValue(isVisible ? 1 : 0);

  React.useEffect(() => {
    if (delay > 0) {
      setTimeout(() => {
        opacity.value = withTiming(isVisible ? 1 : 0, {
          duration: FLIP_DURATION * 0.3,
          easing: Easing.inOut(Easing.cubic),
        });
      }, delay);
    } else {
      opacity.value = withTiming(isVisible ? 1 : 0, {
        duration: FLIP_DURATION * 0.3,
        easing: Easing.inOut(Easing.cubic),
      });
    }
  }, [isVisible, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const tabColor = isActive ? tab.color : getPalerColor(tab.color);

  return (
    <Animated.View style={[styles.tab, style, animatedStyle, { backgroundColor: tabColor }]}>
      <Pressable style={styles.tabPressable} onPress={onPress}>
        <View style={styles.tabTextWrapper}>
          <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface FlippablePageProps {
  index: number;
  totalTabs: number;
  isFlipped: boolean;
  children: React.ReactNode;
  onFlipComplete?: () => void;
  onFlipStart?: () => void;
}

function FlippablePage({
  index,
  totalTabs,
  isFlipped,
  children
}: FlippablePageProps) {
  const rotation = useSharedValue(isFlipped ? 180 : 0);

  React.useEffect(() => {
    // Delay the page flip by 150ms to let tab disappear first
    setTimeout(() => {
      rotation.value = withTiming(isFlipped ? 180 : 0, {
        duration: FLIP_DURATION,
        easing: Easing.inOut(Easing.cubic),
      });
    }, 150);
  }, [isFlipped]);

  const animatedStyle = useAnimatedStyle(() => {
    const zIndex = rotation.value > 90 ? index : (totalTabs - index + 10);

    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotation.value}deg` },
      ],
      zIndex,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const opacity = rotation.value > 90 ? 0 : 1;
    return { opacity };
  });

  return (
    <Animated.View style={[styles.page, animatedStyle]}>
      <Animated.View style={[styles.pageContent, contentStyle]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftTabsColumn: {
    width: TAB_WIDTH,
    flexDirection: 'column',
    ...(Platform.OS !== 'web' ? {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 100,
    } : {}),
  },
  rightTabsColumn: {
    width: TAB_WIDTH,
    flexDirection: 'column',
  },
  tabPlaceholder: {
    flex: 1,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  tabPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: -1, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  tabRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  tabTextWrapper: {
    width: Platform.OS === 'web' ? 120 : 80, // Narrower on mobile to fit smaller tabs
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  tabText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: Platform.OS === 'web' ? 15 : 13,
  },
  pageArea: {
    flex: 1,
    position: 'relative',
  },
  pageAreaMobile: {
    marginRight: 0,
  },
  page: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    transformOrigin: 'right center',
    backfaceVisibility: 'hidden',
  },
  pageContent: {
    flex: 1,
    overflow: 'hidden',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
});
