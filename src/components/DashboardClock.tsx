import React, { useState, useEffect } from 'react';

export const DashboardClock = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="text-right flex flex-col items-end">
            <span className="text-3xl font-bold text-indigo-600 font-mono tracking-tight leading-none">
                {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <span className="text-sm text-slate-400 font-medium capitalize">
                {currentTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
        </div>
    );
};
