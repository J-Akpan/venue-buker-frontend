import { http } from './client'

const data = (p) => p.then((r) => r.data)

export const usersApi = {
    signup: (body) => data(http.post('/users/signup', body)),
    login: (body) => data(http.post('/users/login', body)),
    logout: (refreshToken) => http.post('/users/logout', { refreshToken }),
    me: (signal) => data(http.get('/users/me', { signal })),
    updateMe: (body) => data(http.patch('/users/me', body)),
    changePassword: (body) => data(http.put('/users/me/password', body)),
    forgotPassword: (email) => data(http.post('/users/forgot-password', { email })),
    resetPassword: (body) => data(http.post('/users/reset-password', body)),
    list: (params, signal) => data(http.get('/users', { params, signal })),
}

export const venuesApi = {
    list: (params, signal) => data(http.get('/venues', { params, signal, paramsSerializer: { indexes: null } })),
    get: (id, signal) => data(http.get(`/venues/${id}`, { signal })),
    mine: (params, signal) => data(http.get('/venues/mine', { params, signal })),
    create: (body) => data(http.post('/venues', body)),
    update: (id, body) => data(http.patch(`/venues/${id}`, body)),
    confirmAvailability: (id) => data(http.post(`/venues/${id}/availability-confirmation`)),
    rotateCalendarToken: (id) => data(http.post(`/venues/${id}/calendar-token`)),
    imageUploadSignature: (id) => data(http.post(`/venues/${id}/image-upload-signature`)),
    setVerification: (id, verified) => data(http.post(`/venues/${id}/verification`, { verified })),
    remove: (id) => http.delete(`/venues/${id}`),
}

export const bookingsApi = {
    availability: (params, signal) => data(http.get('/bookings/availability', { params, signal })),
    quote: (params, signal) => data(http.get('/bookings/quote', { params, signal })),
    create: (body, idempotencyKey) =>
        data(http.post('/bookings', body, { headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} })),
    mine: (params, signal) => data(http.get('/bookings', { params, signal })),
    get: (id, signal) => data(http.get(`/bookings/${id}`, { signal })),
    forVenue: (venueId, params, signal) => data(http.get(`/bookings/venue/${venueId}`, { params, signal })),
    analytics: (venueId, params, signal) => data(http.get(`/bookings/venue/${venueId}/analytics`, { params, signal })),
    accept: (id) => data(http.post(`/bookings/${id}/accept`)),
    decline: (id, reason = '') => data(http.post(`/bookings/${id}/decline`, reason.trim() ? { reason: reason.trim() } : {})),
    cancel: (id) => data(http.post(`/bookings/${id}/cancel`)),
}

export const paymentsApi = {
    checkout: (bookingId) => data(http.post('/payments/checkout', { bookingId })),
    forBooking: (bookingId, signal) => data(http.get(`/payments/booking/${bookingId}`, { signal })),
    connectOnboarding: () => data(http.post('/payments/connect/onboarding')),
    connectStatus: (signal) => data(http.get('/payments/connect/status', { signal })),
    settlements: (params, signal) => data(http.get('/payments/connect/settlements', { params, signal })),
}

export const reviewsApi = {
    forVenue: (venueId, params, signal) => data(http.get(`/reviews/venues/${venueId}`, { params, signal })),
    create: (body) => data(http.post('/reviews', body)),
}

// Complaints and disputes raised by bookers / venue owners.
export const supportApi = {
    create: (body) => data(http.post('/support/cases', body)),
    mine: (params, signal) => data(http.get('/support/cases', { params, signal })),
    get: (id, signal) => data(http.get(`/support/cases/${id}`, { signal })),
}

// Staff queue (Admin and Super Admin).
export const adminCasesApi = {
    list: (params, signal) => data(http.get('/admin/cases', { params, signal })),
    get: (id, signal) => data(http.get(`/admin/cases/${id}`, { signal })),
    assign: (id, assigneeId) => data(http.post(`/admin/cases/${id}/assign`, assigneeId ? { assigneeId } : {})),
    resolve: (id, body) => data(http.post(`/admin/cases/${id}/resolve`, body)),
}

// Super Admin only.
export const adminStaffApi = {
    list: (params, signal) => data(http.get('/admin/staff', { params, signal })),
    create: (body) => data(http.post('/admin/staff', body)),
    remove: (userId) => data(http.delete(`/admin/staff/${userId}`)),
    assignRole: (userId, role) => data(http.put(`/admin/users/${userId}/role`, { role })),
}
