// Common OBD-II Diagnostic Trouble Codes mapped to plain-English alerts.
export const DTC_CODES: Record<string, { description: string; severity: 'low' | 'medium' | 'high' }> = {
  P0128: { description: 'Coolant thermostat stuck open — engine may run cold, poor fuel economy', severity: 'medium' },
  P0300: { description: 'Random engine misfire detected — risk of catalytic converter damage', severity: 'high' },
  P0301: { description: 'Cylinder 1 misfire — check spark plug and ignition coil', severity: 'high' },
  P0171: { description: 'Engine running lean (too much air) — possible vacuum leak or fuel delivery issue', severity: 'medium' },
  P0420: { description: 'Catalytic converter efficiency below threshold — emissions fault', severity: 'medium' },
  P0455: { description: 'Large EVAP system leak — often just a loose fuel cap', severity: 'low' },
  P0401: { description: 'Insufficient EGR flow — carbon buildup likely, may cause rough idle', severity: 'medium' },
  P0133: { description: 'Oxygen sensor responding slowly — sensor ageing, replace soon', severity: 'low' },
  P0562: { description: 'Charging system voltage low — check battery and alternator', severity: 'high' },
  P0113: { description: 'Intake air temperature sensor fault — may cause poor cold starting', severity: 'low' },
  P0340: { description: 'Camshaft position sensor fault — engine may stall or fail to start', severity: 'high' },
  P0128_LOW: { description: 'Engine overheating risk — coolant temperature abnormal', severity: 'high' },
};

export function randomDtc() {
  const codes = Object.keys(DTC_CODES).filter((c) => /^P\d{4}$/.test(c));
  const code = codes[Math.floor(Math.random() * codes.length)];
  return { code, ...DTC_CODES[code] };
}
