import React from 'react'

// Minimal stroke icon set (24x24, currentColor) so the UI doesn't depend on emoji rendering.
const PATHS = {
    pin: <><path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.3c1.9.8 3 2.6 3 5.7" /></>,
    card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
    shield: <><path d="M12 3 5 6v5.5c0 4.4 2.9 8 7 9.5 4.1-1.5 7-5.1 7-9.5V6l-7-3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    undo: <><path d="M9 7 4 12l5 5" /><path d="M4 12h10a6 6 0 0 1 0 8h-3" /></>,
    building: <><path d="M4 21V6.5L12 3l8 3.5V21" /><path d="M9 21v-5h6v5M8 10h2M14 10h2M8 13h2M14 13h2" /></>,
    inbox: <><path d="M3.5 13.5 6 5.5h12l2.5 8" /><path d="M3.5 13.5V19a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-5.5H15a3 3 0 0 1-6 0H3.5Z" /></>,
    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.4v.1" /></>,
    heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" />,
    briefcase: <><rect x="3" y="7" width="18" height="12.5" rx="2.5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" /></>,
    sparkle: <><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /><path d="m18.5 16 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></>,
}

export default function Icon({ name, size = 18, className = '', ...rest }) {
    return (
        <svg
            className={`icon ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            {...rest}
        >
            {PATHS[name]}
        </svg>
    )
}
