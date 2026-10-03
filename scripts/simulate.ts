// Starts/stops the server-side fleet simulator via the API.
// Usage: npm run simulate           → starts simulation
//        npm run simulate -- stop   → stops it
const API = process.env.API_URL ?? 'http://localhost:4000';

const { token } = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@fleet.demo', password: 'demo123' }),
}).then((r) => r.json());

if (!token) {
  console.error('Login failed — is the server running and seeded?');
  process.exit(1);
}

const action = process.argv.includes('stop') ? 'stop' : 'start';
const res = await fetch(`${API}/api/sim/${action}`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}` },
}).then((r) => r.json());

console.log(action === 'start' ? `Simulation running: ${res.vehicles} vehicles` : 'Simulation stopped');
