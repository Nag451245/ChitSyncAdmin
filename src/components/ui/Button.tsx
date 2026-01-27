import React from 'react';
import {
    TouchableOpacity,
    TouchableOpacityProps,
    Text,
    ActivityIndicator,
    View,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    children: React.ReactNode;
}

/**
 * Premium Button Component with Animations
 * 
 * Features:
 * - Multiple variants and sizes
 * - Loading state with spinner
 * - Icon support (left/right)
 * - Touch feedback with scale animation
 * - Full width option
 */
export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    children,
    disabled,
    onPressIn,
    onPressOut,
    className = '',
    ...props
}) => {
    const scale = useSharedValue(1);

    const getVariantClasses = () => {
        switch (variant) {
            case 'primary':
                return 'bg-primary-600 active:bg-primary-700';
            case 'secondary':
                return 'bg-neutral-200 active:bg-neutral-300';
            case 'danger':
                return 'bg-loss-600 active:bg-loss-700';
            case 'success':
                return 'bg-profit-600 active:bg-profit-700';
            case 'outline':
                return 'bg-transparent border-2 border-primary-600 active:bg-primary-50';
            default:
                return 'bg-primary-600 active:bg-primary-700';
        }
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'px-3 py-2 rounded-lg';
            case 'md':
                return 'px-4 py-3 rounded-xl';
            case 'lg':
                return 'px-6 py-4 rounded-2xl';
            default:
                return 'px-4 py-3 rounded-xl';
        }
    };

    const getTextVariantClasses = () => {
        switch (variant) {
            case 'primary':
            case 'danger':
            case 'success':
                return 'text-white';
            case 'secondary':
                return 'text-neutral-900';
            case 'outline':
                return 'text-primary-600';
            default:
                return 'text-white';
        }
    };

    const getTextSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'text-sm font-semibold';
            case 'md':
                return 'text-base font-bold';
            case 'lg':
                return 'text-lg font-bold';
            default:
                return 'text-base font-bold';
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = (e: any) => {
        scale.value = withSpring(0.95, { damping: 10 });
        onPressIn?.(e);
    };

    const handlePressOut = (e: any) => {
        scale.value = withSpring(1, { damping: 10 });
        onPressOut?.(e);
    };

    const baseClasses = `
    flex-row
    items-center
    justify-center
    ${getVariantClasses()}
    ${getSizeClasses()}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50' : ''}
    ${className}
  `.trim();

    const textClasses = `
    ${getTextVariantClasses()}
    ${getTextSizeClasses()}
  `.trim();

    return (
        <AnimatedTouchable
            className={baseClasses}
            disabled={disabled || loading}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={animatedStyle}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'secondary' || variant === 'outline' ? '#0ea5e9' : '#ffffff'}
                    size="small"
                />
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <View className="mr-2">{icon}</View>
                    )}
                    <Text className={textClasses}>{children}</Text>
                    {icon && iconPosition === 'right' && (
                        <View className="ml-2">{icon}</View>
                    )}
                </>
            )}
        </AnimatedTouchable>
    );
};

/**
 * Icon-only Button for compact spaces
 */
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
    icon: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
    icon,
    size = 'md',
    ...props
}) => {
    const getSizeClass = () => {
        switch (size) {
            case 'sm':
                return 'w-8 h-8';
            case 'md':
                return 'w-12 h-12';
            case 'lg':
                return 'w-16 h-16';
            default:
                return 'w-12 h-12';
        }
    };

    return (
        <Button {...props} size={size} className={`${getSizeClass()} p-0`}>
            <View className="items-center justify-center">{icon}</View>
        </Button>
    );
};
