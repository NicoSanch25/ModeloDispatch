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
        <div className="flex items-center lg:flex-col lg:items-end gap-2 text-right">
            <span className="text-xl lg:text-3xl font-bold text-indigo-600 tracking-tight leading-none tabular-nums">
                {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="text-xs lg:text-sm text-slate-400 font-medium border-l lg:border-l-0 lg:border-t border-slate-200 pl-2 lg:pl-0 lg:pt-1 ml-2 lg:ml-0">
                {formattedDate}
            </span>
        </div>
    );
};
