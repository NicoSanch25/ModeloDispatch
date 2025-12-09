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

export const timeToMinutes = (timeStr?: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
};

export const minutesToTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const calculateEndTime = (timeStr: string, durationMin: number, extensionMin: number = 0) => {
    const start = timeToMinutes(timeStr);
    const end = start + durationMin + extensionMin;
    return minutesToTime(end);
};

export const subtractTime = (timeStr: string, minutesToSubtract: number) => {
    const start = timeToMinutes(timeStr);
    let newTime = start - minutesToSubtract;
    if (newTime < 0) newTime += 24 * 60;
    return minutesToTime(newTime);
};
