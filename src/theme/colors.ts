/**
 * Premium Color Palette for ChitSync Admin
 * Semantic colors for financial states and brand identity
 */

export const colors = {
    // Primary Brand
    primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
    },

    // Financial Status: Profit/Positive
    profit: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
    },

    // Financial Status: Loss/Negative
    loss: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
    },

    // Warning/Pending/Alert
    warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
    },

    // Neutral Grays
    neutral: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
        950: '#0a0a0a',
    },

    // Status Indicators
    status: {
        active: '#22c55e',
        inactive: '#a3a3a3',
        pending: '#f59e0b',
        prized: '#0ea5e9',
        exited: '#ef4444',
    },

    // Background
    background: {
        primary: '#ffffff',
        secondary: '#f5f5f5',
        tertiary: '#e5e5e5',
        dark: '#171717',
    },

    // Text
    text: {
        primary: '#171717',
        secondary: '#525252',
        tertiary: '#a3a3a3',
        inverse: '#ffffff',
    },
} as const;

export type ColorPalette = typeof colors;
export type ColorKey = keyof ColorPalette;
export type ColorShade = keyof ColorPalette['primary'];
