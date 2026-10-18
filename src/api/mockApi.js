const USERS_KEY = 'vb_users'
const SESS_KEY = 'vb_session'
const VENUES_KEY = 'vb_venues'

function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function write(key, v) { localStorage.setItem(key, JSON.stringify(v)) }

function seedVenues() {
    const existing = read(VENUES_KEY)
    if (existing) return existing
    const venues = [
        { id: '1', name: 'Grand Hall', city: 'Lagos', address: 'Ikeja, Lagos', lat: 6.6018, lng: 3.3515, capacity: 300, price: 50000 },
        { id: '2', name: 'Seaside Pavilion', city: 'Lagos', address: 'Lekki, Lagos', lat: 6.4281, lng: 3.4523, capacity: 150, price: 30000 },
        { id: '3', name: 'Garden Event Space', city: 'Abuja', address: 'Maitama, Abuja', lat: 9.0656, lng: 7.4986, capacity: 200, price: 40000 }
    ]
    write(VENUES_KEY, venues)
    return venues
}

export function getVenues() {
    return seedVenues()
}

export function findVenuesByCity(city) {
    const venues = getVenues()
    return venues.filter(v => v.city.toLowerCase().includes((city || '').toLowerCase()))
}

export function getVenueById(id) {
    return getVenues().find(v => v.id === id)
}

// Owner-specific venue operations
export function getVenuesByOwner(ownerId) {
    const venues = getVenues()
    return venues.filter(v => v.ownerId === ownerId)
}

export async function addVenue(ownerId, data) {
    const venues = getVenues()
    const id = Date.now().toString()
    const v = { id, ownerId, ...data }
    venues.push(v)
    write(VENUES_KEY, venues)
    return { ok: true, venue: v }
}

export async function updateVenue(id, ownerId, data) {
    const venues = getVenues()
    const idx = venues.findIndex(v => v.id === id)
    if (idx === -1) return { ok: false, error: 'Venue not found' }
    if (venues[idx].ownerId !== ownerId) return { ok: false, error: 'Not authorized' }
    venues[idx] = { ...venues[idx], ...data }
    write(VENUES_KEY, venues)
    return { ok: true, venue: venues[idx] }
}

export async function deleteVenue(id, ownerId) {
    const venues = getVenues()
    const idx = venues.findIndex(v => v.id === id)
    if (idx === -1) return { ok: false, error: 'Venue not found' }
    if (venues[idx].ownerId !== ownerId) return { ok: false, error: 'Not authorized' }
    venues.splice(idx, 1)
    write(VENUES_KEY, venues)
    return { ok: true }
}

// Simple in-memory user store via localStorage
function getUsers() {
    return read(USERS_KEY) || []
}

function saveUsers(users) {
    write(USERS_KEY, users)
}

export async function register({ username, email, password, role }) {
    const users = getUsers()
    if (users.find(u => u.email === email)) return { ok: false, error: 'Email exists' }
    const user = { id: Date.now().toString(), username, email, password, role, profile: null, bookings: [] }
    users.push(user)
    saveUsers(users)
    write(SESS_KEY, user)
    return { ok: true, user: sanitize(user) }
}

export function getCurrentUser() {
    const u = read(SESS_KEY)
    return u ? sanitize(u) : null
}

export async function login({ email, password }) {
    const users = getUsers()
    const user = users.find(u => u.email === email && u.password === password)
    if (!user) return { ok: false, error: 'Invalid credentials' }
    write(SESS_KEY, user)
    return { ok: true, user: sanitize(user) }
}

export function logout() {
    localStorage.removeItem(SESS_KEY)
}

export async function updateProfile(data) {
    const cur = read(SESS_KEY)
    if (!cur) return { ok: false, error: 'Not logged' }
    const users = getUsers()
    const idx = users.findIndex(u => u.id === cur.id)
    users[idx] = { ...users[idx], profile: data }
    saveUsers(users)
    write(SESS_KEY, users[idx])
    return { ok: true, user: sanitize(users[idx]) }
}

export async function bookVenue({ userId, venueId, date, purpose }) {
    const users = getUsers()
    const idx = users.findIndex(u => u.id === userId)
    if (idx === -1) return { ok: false, error: 'User not found' }
    // Prevent venue owners from booking venues
    if (users[idx].role === 'owner') return { ok: false, error: 'Venue owners cannot book venues' }
    const booking = { id: Date.now().toString(), venueId, date, purpose }
    users[idx].bookings = users[idx].bookings || []
    users[idx].bookings.push(booking)
    saveUsers(users)
    const cur = read(SESS_KEY)
    if (cur && cur.id === userId) write(SESS_KEY, users[idx])
    return { ok: true, booking }
}

export function getBookingsForUser(userId) {
    const users = getUsers()
    const user = users.find(u => u.id === userId)
    return user ? (user.bookings || []) : []
}

export async function cancelBooking({ userId, bookingId }) {
    const users = getUsers()
    const idx = users.findIndex(u => u.id === userId)
    if (idx === -1) return { ok: false, error: 'User not found' }
    users[idx].bookings = (users[idx].bookings || []).filter(b => b.id !== bookingId)
    saveUsers(users)
    const cur = read(SESS_KEY)
    if (cur && cur.id === userId) write(SESS_KEY, users[idx])
    return { ok: true }
}

export async function updateBooking({ userId, bookingId, date, purpose }) {
    const users = getUsers()
    const idx = users.findIndex(u => u.id === userId)
    if (idx === -1) return { ok: false, error: 'User not found' }
    const bIdx = (users[idx].bookings || []).findIndex(b => b.id === bookingId)
    if (bIdx === -1) return { ok: false, error: 'Booking not found' }
    users[idx].bookings[bIdx] = { ...users[idx].bookings[bIdx], date, purpose }
    saveUsers(users)
    const cur = read(SESS_KEY)
    if (cur && cur.id === userId) write(SESS_KEY, users[idx])
    return { ok: true }
}

function sanitize(u) {
    if (!u) return null
    const { password, ...rest } = u
    return rest
}
