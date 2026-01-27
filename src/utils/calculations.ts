/**
 * Chit Fund Mathematical Calculations
 * All formulas as per PRD specifications
 */

/**
 * Calculate dividend (savings) per member
 * Formula: (Bid Amount - Foreman Commission) / Total Members
 * 
 * @param bidAmount - The winning bid amount for the auction
 * @param foremanCommission - Commission taken by foreman
 * @param totalMembers - Total number of members in the group
 * @returns Dividend amount per member
 */
export const calculateDividend = (
    bidAmount: number,
    foremanCommission: number,
    totalMembers: number
): number => {
    if (totalMembers === 0) return 0;
    return (bidAmount - foremanCommission) / totalMembers;
};

/**
 * Calculate next month's payable amount
 * Formula: Base Installment - Dividend
 * 
 * @param baseInstallment - Monthly installment amount
 * @param dividend - Dividend calculated from auction
 * @returns Next month's payable amount
 */
export const calculateNextPayable = (
    baseInstallment: number,
    dividend: number
): number => {
    return baseInstallment - dividend;
};

/**
 * Calculate prize money for auction winner
 * Formula: Pot Value - Bid Amount
 * 
 * @param potValue - Total pot value
 * @param bidAmount - Winning bid amount
 * @returns Prize money received by winner
 */
export const calculatePrizeMoney = (
    potValue: number,
    bidAmount: number
): number => {
    return potValue - bidAmount;
};

/**
 * Calculate surrender value for exiting member
 * Formula: Total Amount Paid - (Pot Value * 5% Penalty)
 * 
 * @param totalPaid - Total amount paid by member
 * @param potValue - Total pot value
 * @returns Surrender value (refund amount)
 */
export const calculateSurrenderValue = (
    totalPaid: number,
    potValue: number
): number => {
    const penalty = potValue * 0.05;
    return totalPaid - penalty;
};

/**
 * Calculate catch-up amount for new member joining mid-way
 * Formula: Sum of all Net Payable amounts from Month 1 to Current Month
 * 
 * @param netPayableHistory - Array of net payable amounts for each month
 * @returns Total catch-up amount
 */
export const calculateCatchUpAmount = (
    netPayableHistory: number[]
): number => {
    return netPayableHistory.reduce((sum, amount) => sum + amount, 0);
};

/**
 * Calculate foreman's net profit
 * Formula: Total Commissions - (Bad Debts + Operational Costs)
 * 
 * @param totalCommissions - Sum of all commissions earned
 * @param badDebts - Total unrecovered amounts
 * @param operationalCosts - Other expenses
 * @returns Net profit for foreman
 */
export const calculateForemanProfit = (
    totalCommissions: number,
    badDebts: number,
    operationalCosts: number
): number => {
    return totalCommissions - (badDebts + operationalCosts);
};

/**
 * Calculate base installment from pot value and duration
 * Formula: Pot Value / Duration (in months)
 * 
 * @param potValue - Total pot value
 * @param durationMonths - Duration in months
 * @returns Base monthly installment
 */
export const calculateBaseInstallment = (
    potValue: number,
    durationMonths: number
): number => {
    if (durationMonths === 0) return 0;
    return potValue / durationMonths;
};

/**
 * Calculate foreman commission from bid amount
 * Formula: Bid Amount * (Commission Percentage / 100)
 * 
 * @param bidAmount - Winning bid amount
 * @param commissionPercentage - Commission percentage (e.g., 5 for 5%)
 * @returns Commission amount
 */
export const calculateForemanCommission = (
    bidAmount: number,
    commissionPercentage: number
): number => {
    return bidAmount * (commissionPercentage / 100);
};

/**
 * Format number as Indian currency
 * Example: 100000 -> "1,00,000"
 * 
 * @param amount - Number to format
 * @returns Formatted string with Indian comma notation
 */
export const formatIndianCurrency = (amount: number): string => {
    return amount.toLocaleString('en-IN');
};

/**
 * Format currency with rupee symbol
 * Example: 100000 -> "₹1,00,000"
 * 
 * @param amount - Number to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
    return `₹${formatIndianCurrency(amount)}`;
};
