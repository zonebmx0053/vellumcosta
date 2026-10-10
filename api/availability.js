// GET /api/availability?property=casa-1
// Descarga los calendarios iCal (Airbnb, Vrbo, Booking) de una propiedad, los combina
// y devuelve las noches ocupadas. Las URLs iCal son privadas: se leen de variables de
// entorno de Vercel (ICAL_CASA_1_AIRBNB, ICAL_CASA_1_VRBO, ICAL_CASA_1_BOOKING, ...) o,
// si se han escrito en el panel (/admin), de los datos guardados, que tienen prioridad.
// A las noches de las plataformas se suman las reservas directas y los bloqueos anotados
// en el panel (con ?manual=0 se devuelven solo las de las plataformas).

const { loadData } = require('./_lib');

const PROPERTIES = ['casa-1'];
const SOURCES = ['airbnb', 'vrbo', 'booking'];
const TIMEOUT_MS = 8000;
const DAY_MS = 86400000;

const envKey = (id, source) => `ICAL_${id}_${source}`.toUpperCase().replace(/-/g, '_');
const toIso = ms => new Date(ms).toISOString().slice(0, 10);
const toMs = iso => Date.parse(iso + 'T00:00:00Z');
const unescape = text => text.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

// Devuelve [{ start, end, summary, url }] con fechas YYYY-MM-DD; "end" es el día de salida
// (no incluido). "summary" es el texto que pone la plataforma ("Reserved", "CLOSED - Not
// available"…) y "url", el enlace a la reserva cuando Airbnb lo incluye.
function parseIcal(text) {
    if (typeof text !== 'string' || !text.includes('BEGIN:VCALENDAR')) throw new Error('not_ical');
    const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const ranges = [];
    let event = null;
    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') { event = {}; continue; }
        if (!event) continue;
        if (line === 'END:VEVENT') {
            if (event.start && !event.cancelled) {
                let end = event.end;
                if (!end || end <= event.start) end = toIso(toMs(event.start) + DAY_MS);
                ranges.push({ start: event.start, end, summary: event.summary || '', url: event.url || '' });
            }
            event = null;
            continue;
        }
        const sep = line.indexOf(':');
        if (sep < 0) continue;
        const name = line.slice(0, sep).split(';')[0].toUpperCase();
        const value = line.slice(sep + 1).trim();
        if (name === 'DTSTART' || name === 'DTEND') {
            const m = /^(\d{4})(\d{2})(\d{2})/.exec(value);
            if (m) event[name === 'DTSTART' ? 'start' : 'end'] = `${m[1]}-${m[2]}-${m[3]}`;
        } else if (name === 'STATUS' && value.toUpperCase() === 'CANCELLED') {
            event.cancelled = true;
        } else if (name === 'SUMMARY') {
            event.summary = unescape(value).slice(0, 80);
        } else if (name === 'DESCRIPTION') {
            const m = /https:\/\/www\.airbnb\.[a-z.]{2,7}\/hosting\/reservations\/details\/[A-Za-z0-9]+/.exec(value);
            if (m) event.url = m[0];
        }
    }
    return ranges;
}

// Une rangos solapados o consecutivos y descarta los ya pasados.
function mergeRanges(ranges, { today = toIso(Date.now()), bufferDays = 0 } = {}) {
    const sorted = ranges
        .map(r => ({ start: toMs(r.start) - bufferDays * DAY_MS, end: toMs(r.end) + bufferDays * DAY_MS }))
        .filter(r => r.end > toMs(today))
        .sort((a, b) => a.start - b.start);
    const merged = [];
    for (const r of sorted) {
        const last = merged[merged.length - 1];
        if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
        else merged.push({ ...r });
    }
    return merged.map(r => ({ start: toIso(r.start), end: toIso(r.end) }));
}

async function fetchIcal(url) {
    if (!/^https:\/\//i.test(url)) throw new Error('invalid_url');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'VellumCosta-Calendar/1.0' } });
        if (!response.ok) throw new Error('http_' + response.status);
        return parseIcal(await response.text());
    } finally {
        clearTimeout(timer);
    }
}

// Lee los calendarios configurados de una propiedad ("saved" son sus datos del panel, si
// existen). Devuelve el estado de cada plataforma y todos sus eventos, cada uno con su origen.
async function loadCalendars(id, saved) {
    const sources = {};
    const events = [];
    await Promise.all(SOURCES.map(async source => {
        const url = (saved && saved.ical && saved.ical[source]) || process.env[envKey(id, source)];
        if (!url) { sources[source] = 'not_configured'; return; }
        try {
            for (const event of await fetchIcal(url)) events.push({ source, ...event });
            sources[source] = 'ok';
        } catch (e) {
            console.error(`iCal ${id}/${source}: ${e.message}`);
            sources[source] = 'error';
        }
    }));
    return { sources, events };
}

async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'method_not_allowed' });
    }
    const id = String((req.query && req.query.property) || '');

    // Datos del panel: propiedades añadidas, URLs iCal, reservas directas y bloqueos.
    let saved = null, storeFailed = false;
    try {
        const data = await loadData();
        saved = (data && data.properties.find(p => p.id === id)) || null;
    } catch (e) {
        storeFailed = e.message !== 'store_not_configured';
        if (storeFailed) console.error(`availability store: ${e.message}`);
    }
    if (!PROPERTIES.includes(id) && !saved) return res.status(400).json({ error: 'unknown_property' });

    const { sources, events } = await loadCalendars(id, saved);

    // Si falla cualquier calendario configurado (o la lectura de los datos del panel) no se
    // puede garantizar la disponibilidad: "complete" va a false y la web no debe afirmar que
    // las fechas están libres.
    const states = Object.values(sources);
    const complete = states.includes('ok') && !states.includes('error') && !storeFailed;
    const manual = saved && String((req.query && req.query.manual) || '') !== '0' ? saved.blocked || [] : [];
    // Noches de margen alrededor de cada reserva (de plataforma o directa), no de los bloqueos.
    const bufferDays = Math.max(parseInt(process.env.ICAL_BUFFER_DAYS, 10) || 0, (saved && saved.stay && saved.stay.prep) || 0, 0);
    const reservations = [...events, ...manual.filter(b => b.type === 'booking')];
    const blocks = manual.filter(b => b.type !== 'booking');

    res.setHeader('Cache-Control', complete ? 'public, max-age=60, s-maxage=600' : 'no-store');
    return res.status(200).json({
        property: id,
        complete,
        sources,
        busy: complete ? mergeRanges([...mergeRanges(reservations, { bufferDays }), ...blocks]) : [],
        updatedAt: new Date().toISOString(),
    });
}

module.exports = handler;
module.exports.parseIcal = parseIcal;
module.exports.mergeRanges = mergeRanges;
module.exports.envKey = envKey;
module.exports.loadCalendars = loadCalendars;
