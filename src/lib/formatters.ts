export const formatShortId = (id: string, prefix: string = 'SH') => {
    if (!id) return '-';
    // Generate a short ID taking the first 4-6 characters of the UUID
    const shortPart = id.substring(0, 6).toUpperCase();
    return `${prefix}-${shortPart}`;
};
