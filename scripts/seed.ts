// Seeds the demo database. Safe to re-run — clears demo data first.
// The logic lives in the server package so Render can auto-seed on boot.
import { seed } from '../apps/server/src/seed.js';

console.log('Seeding demo data...');
seed();
console.log(`
Seed complete — TWO organizations created for tenant-isolation demo:

  Org 1: Velocity Logistics (Pty) Ltd
    admin@fleet.demo     — admin portal
    dispatch@fleet.demo  — dispatcher
    sipho@fleet.demo     — driver (vehicle JTR 452 GP)
    john@fleet.demo      — driver (vehicle KZN 881 GP)
    amahle@fleet.demo    — driver (vehicle GP 233 LK)
    koos@fleet.demo      — driver (vehicle CA 902 114)

  Org 2: Cape Couriers CC
    admin@cape.demo      — admin (sees ONLY Cape Couriers data)
    driver@cape.demo     — driver (vehicle CF 221 904)

  All passwords: demo123

Upload scripts/sample-fuel.csv on the Fuel page (as org1 admin) to see fraud
detection: GPS mismatch, no-GPS, and over-tank-capacity flags.
`);
