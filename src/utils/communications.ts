import { Linking, Alert, Platform } from 'react-native';

/**
 * Clean phone number to E.164 format or standard format required by WhatsApp
 * Removes spaces, dashes, etc.
 * Assumes +91 if not present for this local context? Or just strips non-digit.
 */
const formatPhoneForWhatsapp = (phone: string): string => {
    let clean = phone.replace(/\D/g, '');
    // If local number (10 digits) and no country code, assuming India (+91) for this specific user request context
    // or just return as is if the user inputs full code.
    // Ideally user inputs full number.
    if (clean.length === 10) {
        clean = `91${clean}`;
    }
    return clean;
};

/**
 * Open WhatsApp with a pre-filled message
 */
export const sendWhatsappMessage = async (phone: string, message: string) => {
    const formattedPhone = formatPhoneForWhatsapp(phone);
    const encodedMessage = encodeURIComponent(message);
    const url = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;

    const supported = await Linking.canOpenURL(url);

    if (supported) {
        await Linking.openURL(url);
    } else {
        // Fallback or Alert
        Alert.alert(
            'WhatsApp Not Installed',
            'Cannot open WhatsApp. Please make sure it is installed on your device.',
            [{ text: 'OK' }]
        );
        console.warn('WhatsApp not supported/installed on this device simulator');
    }
};

/**
 * Generate standard messages
 */
export const MessageTemplates = {
    paymentReceipt: (memberName: string, amount: string, month: string, groupName: string) =>
        `Dear ${memberName}, we have received your payment of ${amount} for ${groupName} (Month ${month}). Thank you!`,

    auctionWinner: (memberName: string, amount: string, groupName: string, month: string) =>
        `Congratulations ${memberName}! You have won the auction for ${groupName} (Month ${month}) with a bid of ${amount}.`,

    paymentReminder: (memberName: string, amount: string, groupName: string) =>
        `Hello ${memberName}, this is a reminder to pay your due amount of ${amount} for ${groupName}. Please pay at the earliest.`,

    groupClosure: (groupName: string, settlementAmount: string) =>
        `Notifiction: Group ${groupName} has been officially closed. Your final settlement amount is ${settlementAmount}.`
};
