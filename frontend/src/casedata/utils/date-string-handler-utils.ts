// Local ISO YYYY-MM-DD (without UTC offset glitch)
export const todayLocalISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export const toLocalISODate = (d = new Date()) => {
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export const toLocalISODateTime = (d = new Date()) => {
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

// Parses 'TODAY', 'TODAY+7', 'TODAY-3' into YYYY-MM-DD (local)
export const resolveDateToken = (v?: string) => {
  if (!v) return undefined;
  if (v === 'TODAY') return todayLocalISO();

  const m = v.match(/^TODAY([+-]\d+)$/);
  if (m) {
    const offset = parseInt(m[1], 10);
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  }

  return v;
};

// Parses 'NOW', 'NOW+2h', 'TODAY', 'TODAY+3' into YYYY-MM-DDTHH:mm (local)
export const resolveDateTimeToken = (v?: string) => {
  if (!v) return undefined;
  if (v === 'NOW') return toLocalISODateTime();

  const h = v.match(/^NOW\+(\d+)h$/);
  if (h) {
    const d = new Date();
    d.setHours(d.getHours() + parseInt(h[1], 10));
    return toLocalISODateTime(d);
  }

  if (v === 'TODAY') return `${toLocalISODate()}T00:00`;

  const m = v.match(/^TODAY([+-]\d+)$/);
  if (m) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(m[1], 10));
    return `${toLocalISODate(d)}T00:00`;
  }

  return v;
};
