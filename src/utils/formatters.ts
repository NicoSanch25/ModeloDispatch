export const formatDateAR = (dateStr?: string) => {
    if (!dateStr) return '--/--';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
};

export const getMonthLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
};

export const formatTime24 = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
        const [h, m] = parts;
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
    return timeStr;
};
