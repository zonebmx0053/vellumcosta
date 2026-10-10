// Código compartido por las funciones de /api (el guion bajo evita que Vercel lo publique como ruta).
// - Almacén: Upstash Redis por su API REST. Vercel crea las variables KV_REST_API_URL y
//   KV_REST_API_TOKEN al conectar la base de datos al proyecto.
// - Sesión del panel: contraseña en la variable ADMIN_PASSWORD (mínimo 10 caracteres).

const crypto = require('crypto');
const catalog = require('../catalogo');

const DATA_KEY = 'vellum:properties';
const COOKIE = 'vc_admin';
const SESSION_DAYS = 7;
const MAX_LOGIN_ATTEMPTS = 8;       // por IP
const LOGIN_WINDOW_S = 900;         // cada 15 minutos
const MAX_DATA_CHARS = 400000;
const SOURCES = ['airbnb', 'vrbo', 'booking'];

function fail(code, status) {
    const e = new Error(code);
    e.status = status;
    return e;
}

// ── Almacén ──
async function redis(...command) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw fail('store_not_configured', 503);
    let response, body;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(command),
            signal: AbortSignal.timeout(5000),
        });
        body = await response.json();
    } catch (e) {
        throw fail('store_error', 502);
    }
    if (!response.ok || body.error) throw fail('store_error', 502);
    return body.result;
}

// Datos guardados desde el panel, o null si todavía no se ha guardado nada.
async function loadData() {
    const raw = await redis('GET', DATA_KEY);
    return raw ? JSON.parse(raw) : null;
}

async function saveData(data) {
    await redis('SET', DATA_KEY, JSON.stringify(data));
}

// ── Sesión ──
function adminPassword() {
    const password = process.env.ADMIN_PASSWORD || '';
    if (password.length < 10) throw fail('password_not_configured', 503);
    return password;
}
const digest = text => crypto.createHash('sha256').update(String(text)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));
const sign = expires => crypto.createHmac('sha256', adminPassword()).update('session:' + expires).digest('hex');

function sessionCookie(clear) {
    const expires = Date.now() + SESSION_DAYS * 86400000;
    const value = clear ? '' : `${expires}.${sign(expires)}`;
    return `${COOKIE}=${value}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_DAYS * 86400}`;
}

function hasSession(req) {
    const m = new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([a-f0-9]{64})`).exec(req.headers.cookie || '');
    return !!m && Number(m[1]) > Date.now() && safeEqual(m[2], sign(m[1]));
}

// Comprueba la contraseña limitando los intentos por IP.
async function login(req, password) {
    const expected = adminPassword();
    const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const key = `vellum:login:${ip}`;
    const attempts = await redis('INCR', key);
    if (attempts === 1) await redis('EXPIRE', key, LOGIN_WINDOW_S);
    if (attempts > MAX_LOGIN_ATTEMPTS) throw fail('too_many_attempts', 429);
    if (typeof password !== 'string' || !safeEqual(password, expected)) throw fail('wrong_password', 401);
    await redis('DEL', key);
}

// Las peticiones del panel solo se aceptan desde la propia web.
function sameOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true;
    try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

// ── Validación de los datos que guarda el panel ──
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, min, max, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const int = (v, min, max, fallback = 0) => Math.round(num(v, min, max, fallback));
const list = (v, max = 100) => (Array.isArray(v) ? v.slice(0, max) : []);
const pair = (v, max) => ({ es: str(v && v.es, max), en: str(v && v.en, max) });
const link = v => { const s = str(v, 600); return /^https:\/\//i.test(s) ? s : ''; };
const photo = v => {
    const s = str(v, 300);
    return /^https:\/\/[^<>"'\s]+$/i.test(s) || /^[^:<>"'\\]+\.(jpe?g|png|webp|avif)$/i.test(s) ? s : '';
};
const slugify = v => str(v, 200).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

function cleanProperty(p) {
    p = p && typeof p === 'object' ? p : {};
    const id = str(p.id, 40);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw fail('invalid_id', 400);
    const today = new Date().toISOString().slice(0, 10);
    const price = p.price || {};
    const gallery = list(p.gallery, 200).map(photo).filter(Boolean);
    const ical = p.ical || {}, links = p.links || {}, house = p.house || {};

    // Servicios: se guardan los identificadores elegidos en el panel. Si llegan datos del
    // formato antiguo (textos libres), se convierten a la selección equivalente del catálogo.
    const legacy = Array.isArray(p.services) ? null : catalog.fromLegacy(p);
    const services = [...new Set(list(legacy ? legacy.services : p.services, 200).filter(id => catalog.services[id]))];
    const selection = {
        type: catalog.find(catalog.types, p.type) ? p.type : '',
        services,
        featured: [...new Set(list(legacy ? legacy.featured : p.featured, 50).filter(id => services.includes(id)))].slice(0, 6),
        extraServices: list(legacy ? legacy.extras : p.extraServices, 30).map(x => pair(x, 120)).filter(x => x.es),
        house: Object.fromEntries(catalog.house.map(h => [h.id, catalog.find(h.options, house[h.id]) ? house[h.id] : ''])),
        cancellation: catalog.find(catalog.cancellation, p.cancellation) ? p.cancellation : '',
    };
    // Precios por fechas. Las temporadas antiguas (mes-día) se convierten a este formato.
    const rules = Array.isArray(price.rules) ? price.rules : catalog.seasonsToRules(price.seasons);

    return {
        id,
        slug: slugify(p.slug) || id,
        hidden: !!p.hidden,
        name: pair(p.name, 160),
        location: pair(p.location, 80),
        province: str(p.province, 80),
        license: str(p.license, 60),
        image: gallery[0] || photo(p.image),
        imageAlt: pair(p.imageAlt, 200),
        thumbs: !!p.thumbs,
        gallery,
        summary: pair(p.summary, 400),
        guests: int(p.guests, 1, 99, 1),
        bedrooms: int(p.bedrooms, 0, 99),
        bathrooms: int(p.bathrooms, 0, 99),
        toilets: int(p.toilets, 0, 99),
        description: pair(p.description, 5000),
        // Lo que se elige en el panel...
        ...selection,
        // ...y lo que se calcula a partir de ello para la web: highlights, amenities,
        // typeLabel, houseRules y cancellationText.
        ...catalog.derive(selection),
        locationText: pair(p.locationText, 2000),
        mapQuery: str(p.mapQuery, 160),
        mapZoom: int(p.mapZoom, 1, 20, 14),
        checkIn: TIME.test(p.checkIn) ? p.checkIn : '',
        checkOut: TIME.test(p.checkOut) ? p.checkOut : '',
        pets: pair(p.pets, 600),
        price: {
            base: num(price.base, 0, 100000),
            // Cada regla: fechas (ambas incluidas), precio por noche (0 = el precio base),
            // estancia mínima (0 = la general), noches de la semana a las que se aplica
            // (0 = lunes … 6 = domingo; vacío = todas) y si se repite cada año.
            rules: list(rules, 60)
                .filter(r => r && ISO.test(r.start) && ISO.test(r.end) && r.end >= r.start)
                .map(r => ({
                    name: str(r.name, 60),
                    start: r.start,
                    end: r.end,
                    price: num(r.price, 0, 100000),
                    minNights: int(r.minNights, 0, 365),
                    days: [...new Set(list(r.days, 7).map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort(),
                    repeat: !!r.repeat,
                })),
            seasons: [],
            cleaningFee: num(price.cleaningFee, 0, 100000),
            minNights: int(price.minNights, 1, 365, 1),
            approx: !!price.approx,
        },
        reviews: list(p.reviews, 200).filter(r => r && SOURCES.includes(r.source)).map(r => {
            const max = Number(r.max) === 10 ? 10 : 5;
            return {
                source: r.source,
                name: str(r.name, 80),
                date: pair(r.date, 40),
                rating: max === 5 ? int(r.rating, 0, 5, 5) : num(r.rating, 0, 10, 10),
                max,
                text: str(r.text, 3000),
            };
        }),
        links: { airbnb: link(links.airbnb), vrbo: link(links.vrbo), booking: link(links.booking) },
        // Privado: no se envía a la web pública.
        ical: { airbnb: link(ical.airbnb), vrbo: link(ical.vrbo), booking: link(ical.booking) },
        blocked: list(p.blocked, 500)
            .filter(b => b && ISO.test(b.start) && ISO.test(b.end) && b.end > b.start && b.end > today)
            .map(b => ({ start: b.start, end: b.end, note: str(b.note, 120) }))
            .sort((a, b) => (a.start < b.start ? -1 : 1)),
        demoBusy: list(p.demoBusy, 50).filter(r => Array.isArray(r) && r.length === 2).map(r => [int(r[0], 0, 3650), int(r[1], 0, 3650)]),
    };
}

function clean(input) {
    if (!input || typeof input !== 'object' || !Array.isArray(input.properties)) throw fail('invalid_data', 400);
    if (JSON.stringify(input).length > MAX_DATA_CHARS) throw fail('too_large', 413);
    const c = input.contact || {};
    const properties = input.properties.slice(0, 30).map(cleanProperty);
    for (const key of ['id', 'slug']) {
        const values = properties.map(p => p[key]);
        if (new Set(values).size !== values.length) throw fail('duplicate_' + key, 400);
    }
    return {
        demo: !!input.demo,
        contact: {
            phone: str(c.phone, 40),
            tel: str(c.tel, 40).replace(/[^+\d]/g, ''),
            whatsapp: str(c.whatsapp, 40).replace(/\D/g, ''),
            email: str(c.email, 120),
        },
        properties,
    };
}

// Lo que ve la web pública: sin propiedades ocultas ni datos privados (iCal, bloqueos y sus notas).
function publicData(data) {
    return {
        ...data,
        properties: data.properties.filter(p => !p.hidden).map(({ hidden, ical, blocked, ...rest }) => rest),
    };
}

module.exports = { SOURCES, redis, loadData, saveData, hasSession, sessionCookie, login, sameOrigin, clean, publicData, adminPassword };
