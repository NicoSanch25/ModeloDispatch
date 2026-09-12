import React, { useState, useEffect } from 'react';

export const DashboardClock = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const dateStr = currentTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    return (
        <div className="flex items-center gap-2 text-slate-500 text-xs md:text-sm mt-0.5">
            <span className="font-bold text-slate-700 tabular-nums">
                {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="font-medium">
                {formattedDate}
            </span>
        </div>
    );
};
