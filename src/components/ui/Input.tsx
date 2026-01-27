import React, { useState } from 'react';
import {
    View,
    TextInput,
    TextInputProps,
    Text,
    TouchableOpacity,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    variant?: 'default' | 'currency' | 'phone';
    containerClassName?: string;
}

/**
 * Premium Input Component with Validation States
 * 
 * Features:
 * - Label and error message support
 * - Left and right icon slots
 * - Currency formatting variant
 * - Phone number variant
 * - Animated border on focus
 * - Hint text support
 */
export const Input: React.FC<InputProps> = ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    variant = 'default',
    containerClassName = '',
    className = '',
    onFocus,
    onBlur,
    value,
    onChangeText,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderWidth = useSharedValue(1);
    const borderColor = useSharedValue('#e5e5e5');

    const animatedBorderStyle = useAnimatedStyle(() => ({
        borderWidth: borderWidth.value,
        borderColor: borderColor.value,
    }));

    const handleFocus = (e: any) => {
        setIsFocused(true);
        borderWidth.value = withTiming(2, { duration: 200 });
        borderColor.value = error ? '#ef4444' : '#0ea5e9';
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        borderWidth.value = withTiming(1, { duration: 200 });
        borderColor.value = error ? '#ef4444' : '#e5e5e5';
        onBlur?.(e);
    };

    const formatCurrency = (text: string) => {
        // Remove non-numeric characters
        const numeric = text.replace(/[^0-9]/g, '');
        // Add commas for thousands
        return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const formatPhone = (text: string) => {
        // Remove non-numeric characters
        const numeric = text.replace(/[^0-9]/g, '');
        // Format as Indian phone number: +91 XXXXX XXXXX
        if (numeric.length <= 5) return numeric;
        if (numeric.length <= 10) {
            return `${numeric.slice(0, 5)} ${numeric.slice(5)}`;
        }
        return `${numeric.slice(0, 5)} ${numeric.slice(5, 10)}`;
    };

    const handleChangeText = (text: string) => {
        if (variant === 'currency') {
            const formatted = formatCurrency(text);
            onChangeText?.(formatted);
        } else if (variant === 'phone') {
            const formatted = formatPhone(text);
            onChangeText?.(formatted);
        } else {
            onChangeText?.(text);
        }
    };

    const inputClasses = `
    flex-1
    text-base
    text-neutral-900
    ${className}
  `.trim();

    return (
        <View className={`mb-4 ${containerClassName}`}>
            {label && (
                <Text className="text-sm font-semibold text-neutral-700 mb-2">
                    {label}
                </Text>
            )}

            <Animated.View
                className="flex-row items-center bg-white rounded-xl px-4 py-3"
                style={animatedBorderStyle}
            >
                {leftIcon && <View className="mr-3">{leftIcon}</View>}

                <TextInput
                    className={inputClasses}
                    placeholderTextColor="#a3a3a3"
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    value={value}
                    onChangeText={handleChangeText}
                    keyboardType={
                        variant === 'currency' || variant === 'phone'
                            ? 'numeric'
                            : props.keyboardType
                    }
                    {...props}
                />

                {rightIcon && <View className="ml-3">{rightIcon}</View>}
            </Animated.View>

            {error && (
                <Text className="text-xs text-loss-600 mt-1 ml-1">{error}</Text>
            )}

            {hint && !error && (
                <Text className="text-xs text-neutral-500 mt-1 ml-1">{hint}</Text>
            )}
        </View>
    );
};

/**
 * Currency Input with Rupee Symbol
 */
interface CurrencyInputProps extends Omit<InputProps, 'variant' | 'leftIcon'> { }

export const CurrencyInput: React.FC<CurrencyInputProps> = (props) => {
    return (
        <Input
            {...props}
            variant="currency"
            leftIcon={<Text className="text-lg font-bold text-neutral-700">₹</Text>}
            placeholder="0"
        />
    );
};

/**
 * Phone Input with Country Code
 */
interface PhoneInputProps extends Omit<InputProps, 'variant' | 'leftIcon'> { }

export const PhoneInput: React.FC<PhoneInputProps> = (props) => {
    return (
        <Input
            {...props}
            variant="phone"
            leftIcon={<Text className="text-sm font-semibold text-neutral-500">+91</Text>}
            placeholder="XXXXX XXXXX"
            maxLength={11} // 5 + space + 5
        />
    );
};
