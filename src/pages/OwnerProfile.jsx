import React from 'react'
import { Navigate } from 'react-router-dom'

/** Compatibility redirect to the API-backed owner dashboard. */
export default function OwnerProfile() {
    return <Navigate to="/owner" replace />
}
