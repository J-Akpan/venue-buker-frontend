import React from 'react'
import { Navigate } from 'react-router-dom'

/** Compatibility redirect to the current profile editor. */
export default function ProfileUpdate() {
    return <Navigate to="/profile" replace />
}
