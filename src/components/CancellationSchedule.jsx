import React from 'react'

const hoursLabel = (hours) => {
    if (hours === 0) return 'Any time before the event'
    if (hours % 24 === 0) {
        const days = hours / 24
        return `At least ${days} day${days === 1 ? '' : 's'} before the event`
    }
    return `At least ${hours} hour${hours === 1 ? '' : 's'} before the event`
}

export const estimateCancellationRefundPercent = (rules, startsAt, cancelledAt = new Date()) => {
    const noticeHours = Math.max(0, (new Date(startsAt).getTime() - new Date(cancelledAt).getTime()) / 3_600_000)
    const tier = [...(Array.isArray(rules) ? rules : [])]
        .filter((rule) => noticeHours >= Number(rule.noticeHours))
        .sort((a, b) => Number(b.noticeHours) - Number(a.noticeHours))[0]
    return Number(tier?.refundPercent ?? 0)
}

export default function CancellationSchedule({ rules, title = 'Refund schedule' }) {
    if (!Array.isArray(rules) || rules.length === 0) return null
    const sorted = [...rules].sort((a, b) => Number(b.noticeHours) - Number(a.noticeHours))
    const hasAnytimeRule = sorted.some((rule) => Number(rule.noticeHours) === 0)

    return (
        <div className="cancellation-schedule">
            <strong>{title}</strong>
            <ul>
                {sorted.map((rule) => (
                    <li key={rule.noticeHours}>
                        {hoursLabel(Number(rule.noticeHours))}: <b>{Number(rule.refundPercent)}% refund</b>
                    </li>
                ))}
                {!hasAnytimeRule && <li>With less notice than the listed periods: <b>0% refund</b></li>}
            </ul>
        </div>
    )
}
