import React from 'react';
import { View, ViewProps } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface CardProps extends ViewProps {
    variant?: 'default' | 'glass' | 'gradient';
    gradientType?: 'primary' | 'profit' | 'loss' | 'warning';
    children: React.ReactNode;
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
}

export const FinancialCard: React.FC<FinancialCardProps> = ({
    status = 'neutral',
    amount,
    label,
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

    return (
        <Card {...props}>
            {(amount || label) && (
                <View className="mb-2">
                    {label && (
                        <View className="text-sm text-neutral-500 mb-1">{label}</View>
                    )}
                    {amount && (
                        <View className={`text-2xl font-bold ${getStatusColor()}`}>
                            {amount}
                        </View>
                    )}
                </View>
            )}
            {children}
        </Card>
    );
};
