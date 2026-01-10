import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect } from 'react';
import {
    LayoutChangeEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface SegmentedControlProps {
    options: string[];
    selectedOption: string;
    onOptionPress?: (option: string) => void;
    style?: any;
}

export function SegmentedControl({
    options,
    selectedOption,
    onOptionPress,
    style,
}: SegmentedControlProps) {
    const [containerWidth, setContainerWidth] = React.useState(0);
    const translateX = useSharedValue(0);
    const selectedIndex = options.indexOf(selectedOption);

    // Colors
    const backgroundColor = useThemeColor({ light: '#7676801F', dark: '#7676803D' }, 'background'); // iOS Standard grouped bg
    const indicatorColor = useThemeColor({ light: '#FFFFFF', dark: '#636366' }, 'background');
    const textColor = useThemeColor({}, 'text');

    const itemWidth = containerWidth / options.length;

    useEffect(() => {
        if (containerWidth > 0) {
            translateX.value = withSpring(selectedIndex * itemWidth, {
                damping: 15,
                stiffness: 150,
            });
        }
    }, [selectedIndex, containerWidth]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
            width: itemWidth - 4, // slight padding
        };
    });

    return (
        <View
            style={[
                styles.container,
                { backgroundColor },
                style,
            ]}
            onLayout={(event: LayoutChangeEvent) => {
                setContainerWidth(event.nativeEvent.layout.width);
            }}>
            {containerWidth > 0 && (
                <Animated.View
                    style={[
                        styles.activeIndicator,
                        {
                            backgroundColor: indicatorColor,
                            // width is set in animatedStyle
                        },
                        animatedStyle,
                    ]}
                />
            )}
            {options.map((option) => {
                const isSelected = option === selectedOption;
                return (
                    <TouchableOpacity
                        key={option}
                        onPress={() => onOptionPress?.(option)}
                        style={styles.option}
                        activeOpacity={0.7}>
                        <Text
                            style={[
                                styles.label,
                                { color: textColor },
                                isSelected && styles.activeLabel,
                            ]}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 36,
        borderRadius: 8,
        padding: 2,
        alignItems: 'center',
    },
    activeIndicator: {
        position: 'absolute',
        top: 2,
        bottom: 2,
        left: 2,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    option: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
    },
    activeLabel: {
        fontWeight: '600',
    },
});
