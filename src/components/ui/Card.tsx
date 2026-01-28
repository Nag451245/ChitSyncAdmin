import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface CardProps extends ViewProps {
    variant?: 'default' | 'glass' | 'gradient';
    gradientType?: 'primary' | 'profit' | 'loss' | 'warning';
    children?: React.ReactNode;
    animated?: boolean;
}

/**
 * Premium Card Component with Glassmorphism Effects
 * 
 * Features:
 * - Multiple variants (default, glass, gradient)
 * - Smooth shadows and rounded corners
 * - Optional animation on mount
 * - Touch feedback ready
 */
export const Card: React.FC<CardProps> = ({
    variant = 'default',
    gradientType,
    children,
    animated = false,
    className = '',
    style,
    ...props
}) => {
    const getVariantClasses = () => {
        switch (variant) {
            case 'glass':
                return 'bg-white/70 backdrop-blur-lg border border-white/20';
            case 'gradient':
                return gradientType === 'primary'
                    ? 'bg-gradient-to-br from-primary-500 to-primary-700'
                    : gradientType === 'profit'
                        ? 'bg-gradient-to-br from-profit-500 to-profit-700'
                        : gradientType === 'loss'
                            ? 'bg-gradient-to-br from-loss-500 to-loss-700'
                            : 'bg-gradient-to-br from-warning-500 to-warning-700';
            default:
                return 'bg-white';
        }
    };

    const baseClasses = `
    rounded-2xl
    p-4
    shadow-medium
    ${getVariantClasses()}
    ${className}
  `.trim();

    const CardComponent = animated ? Animated.View : View;
    const animationProps = animated
        ? { entering: FadeIn.duration(300), exiting: FadeOut.duration(200) }
        : {};

    return (
        <CardComponent
            className={baseClasses}
            style={style}
            {...animationProps}
            {...props}
        >
            {children}
        </CardComponent>
    );
};

/**
 * Specialized Financial Card with Status Indicator
 */
interface FinancialCardProps extends CardProps {
    status?: 'profit' | 'loss' | 'neutral';
    amount?: string;
    label?: string;
    title?: string;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
}

export const FinancialCard: React.FC<FinancialCardProps> = ({
    status = 'neutral',
    amount,
    label,
    title,
    trend,
    trendDirection,
    children,
    ...props
}) => {
    const getStatusColor = () => {
        switch (status) {
            case 'profit':
                return 'text-profit-600';
            case 'loss':
                return 'text-loss-600';
            default:
                return 'text-neutral-700';
        }
    };

    const getTrendColor = () => {
        if (!trendDirection) return 'text-neutral-500';
        return trendDirection === 'up' ? 'text-green-600' : trendDirection === 'down' ? 'text-red-600' : 'text-neutral-500';
    };

    const displayLabel = title || label;

    return (
        <Card {...props}>
            {(amount || displayLabel) && (
                <View className="mb-2">
                    {displayLabel && (
                        <View className="text-sm text-neutral-500 mb-1">{displayLabel}</View>
                    )}
                    {amount && (
                        <View className="flex-row items-baseline justify-between">
                            <Text className={`text-2xl font-bold ${getStatusColor()}`}>
                                {amount}
                            </Text>
                        </View>
                    )}
                    {trend && (
                        <View className="flex-row items-center mt-1">
                            <Text className={`text-xs ${getTrendColor()} font-medium`}>
                                {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : ''} {trend}
                            </Text>
                        </View>
                    )}
                </View>
            )}
            {children}
        </Card>
    );
};
