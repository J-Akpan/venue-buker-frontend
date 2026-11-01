import React, { useState } from 'react'
import { adminStaffApi, usersApi } from '../api'
import { parseError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { useAsync, useTitle } from '../lib/hooks'
import { dateTime } from '../lib/format'
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../components/ui'

export default function AdminUsers() {
    useTitle('Users')
    const { user, isSuperAdmin } = useAuth()
    const toast = useToast()
    const [page, setPage] = useState(1)
    const { data, error, loading, reload } = useAsync((signal) => usersApi.list({ page, limit: 25 }, signal), [page])

    const changeRole = async (u, role) => {
        try {
            await adminStaffApi.assignRole(u.userId, role)
            toast.success(`${u.username} is now ${role}. They will need to sign in again.`)
            reload()
        } catch (err) {
            toast.error(parseError(err).message)
        }
    }

    return (
        <div className="container section">
            <PageHeader title="Users" subtitle={data ? `${data.meta.total} registered accounts` : undefined} />
            {error ? (
                <ErrorState error={error} onRetry={reload} />
            ) : loading && !data ? (
                <Spinner />
            ) : data.data.length === 0 ? (
                <EmptyState title="No users" />
            ) : (
                <>
                    <div className="card table-wrap">
                        <table className="table">
                            <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Name</th><th>Joined</th>{isSuperAdmin && <th>Change role</th>}</tr></thead>
                            <tbody>
                                {data.data.map((u) => (
                                    <tr key={u.userId}>
                                        <td><strong>{u.username}</strong></td>
                                        <td>{u.email}</td>
                                        <td><span className="chip">{u.role}</span></td>
                                        <td>{[u.firstname, u.lastname].filter(Boolean).join(' ') || <span className="muted">—</span>}</td>
                                        <td>{dateTime(u.createdAt)}</td>
                                        {isSuperAdmin && (
                                            <td>
                                                {u.role !== 'Super Admin' && u.userId !== user?.userId && (
                                                    <select aria-label={`Role for ${u.username}`} value={u.role} onChange={(e) => changeRole(u, e.target.value)} style={{ width: 'auto' }}>
                                                        <option>User</option>
                                                        <option>Venue Owner</option>
                                                        <option>Admin</option>
                                                    </select>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={data.meta} onPage={setPage} />
                </>
            )}
        </div>
    )
}
