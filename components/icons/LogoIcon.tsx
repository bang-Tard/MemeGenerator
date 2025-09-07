
import React from 'react';

const LogoIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 2c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"></path>
            <path d="M8 14s1.5-2 4-2 4 2 4 2"></path>
            <path d="M9 9h.01"></path>
            <path d="M15 9h.01"></path>
        </svg>
    );
};

export default LogoIcon;
