// Legacy venue-only demo helpers. Authentication and bookings use the server API.
const VENUES_KEY = 'vb_venues'

function readVenues() {
    try { return JSON.parse(localStorage.getItem(VENUES_KEY) || 'null') } catch { return null }
}

function writeVenues(venues) {
    try { localStorage.setItem(VENUES_KEY, JSON.stringify(venues)) } catch { /* storage may be unavailable */ }
}

function seedVenues() {
    const existing = readVenues()
    if (existing) return existing
    const venues = [
        { id: '1', name: 'Grand Hall', city: 'Lagos', address: 'Ikeja, Lagos', lat: 6.6018, lng: 3.3515, capacity: 300, price: 50000 },
        { id: '2', name: 'Seaside Pavilion', city: 'Lagos', address: 'Lekki, Lagos', lat: 6.4281, lng: 3.4523, capacity: 150, price: 30000 },
        { id: '3', name: 'Garden Event Space', city: 'Abuja', address: 'Maitama, Abuja', lat: 9.0656, lng: 7.4986, capacity: 200, price: 40000 },
    ]
    writeVenues(venues)
    return venues
}

export function getVenues() {
    return seedVenues()
}

export function findVenuesByCity(city) {
    return getVenues().filter((venue) => venue.city.toLowerCase().includes((city || '').toLowerCase()))
}

export function getVenueById(id) {
    return getVenues().find((venue) => venue.id === id)
}

export function getVenuesByOwner(ownerId) {
    return getVenues().filter((venue) => venue.ownerId === ownerId)
}

export async function addVenue(ownerId, data) {
    const venues = getVenues()
    const venue = { id: Date.now().toString(), ownerId, ...data }
    venues.push(venue)
    writeVenues(venues)
    return { ok: true, venue }
}

export async function updateVenue(id, ownerId, data) {
    const venues = getVenues()
    const index = venues.findIndex((venue) => venue.id === id)
    if (index === -1) return { ok: false, error: 'Venue not found' }
    if (venues[index].ownerId !== ownerId) return { ok: false, error: 'Not authorized' }
    venues[index] = { ...venues[index], ...data }
    writeVenues(venues)
    return { ok: true, venue: venues[index] }
}

export async function deleteVenue(id, ownerId) {
    const venues = getVenues()
    const index = venues.findIndex((venue) => venue.id === id)
    if (index === -1) return { ok: false, error: 'Venue not found' }
    if (venues[index].ownerId !== ownerId) return { ok: false, error: 'Not authorized' }
    venues.splice(index, 1)
    writeVenues(venues)
    return { ok: true }
}
