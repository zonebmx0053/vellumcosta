// Panel privado de alojamientos (/admin). Lee y guarda los datos mediante /api/admin.
// Las listas de opciones están en catalogo.js y el cálculo de precios en precios.js.
(function () {
    var root = document.getElementById('admin');
    var C = window.VELLUM_CATALOG, PR = window.VELLUM_PRICING;
    if (!root || !C || !PR) return;

    var st = {
        data: null, dirty: false, fresh: false, saving: false, failed: false,
        events: {}, eventsAt: '', sync: 'idle',              // calendarios de las plataformas: idle | loading | ok | error
        page: 'alojamientos', prop: null, tab: 'general', menu: false,   // prop: alojamiento elegido (null = ninguno)
        when: 'active', kind: 'all',                         // filtros de Reservas
        month: null, pick: null, range: null, seg: null,     // Calendario: mes visible, selección y tramo abierto
        side: null, draft: null,                             // Calendario: apartado abierto del panel lateral y su borrador
        form: null,                                          // reserva directa o bloqueo que se está editando
        rule: null, table: {}, sim: null                     // precio por fechas abierto, gráficos en tabla, simulador
    };

    var DAY = 86400000;
    var now = new Date();
    var today = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
    var WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    var MONTHS = [['enero', 'January'], ['febrero', 'February'], ['marzo', 'March'], ['abril', 'April'], ['mayo', 'May'], ['junio', 'June'],
        ['julio', 'July'], ['agosto', 'August'], ['septiembre', 'September'], ['octubre', 'October'], ['noviembre', 'November'], ['diciembre', 'December']];
    var PROVINCES = ['Málaga', 'Cádiz', 'Granada', 'Almería', 'Córdoba', 'Sevilla', 'Huelva', 'Jaén', 'A Coruña', 'Álava', 'Albacete', 'Alicante', 'Asturias', 'Ávila',
        'Badajoz', 'Barcelona', 'Bizkaia', 'Burgos', 'Cáceres', 'Cantabria', 'Castellón', 'Ceuta', 'Ciudad Real', 'Cuenca', 'Gipuzkoa', 'Girona', 'Guadalajara', 'Huesca',
        'Illes Balears', 'La Rioja', 'Las Palmas', 'León', 'Lleida', 'Lugo', 'Madrid', 'Melilla', 'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Pontevedra', 'Salamanca',
        'Santa Cruz de Tenerife', 'Segovia', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Zamora', 'Zaragoza'];
    var ZOOMS = [[11, 'Comarca (muy lejos)'], [12, 'Municipio y alrededores'], [13, 'Municipio'], [14, 'Zona'], [15, 'Barrio'], [16, 'Calles cercanas'], [17, 'Calle (muy cerca)']];
    var REVIEWS = { airbnb: 'Airbnb', vrbo: 'Vrbo', booking: 'Booking.com' };
    var SCALE = { airbnb: 5, vrbo: 10, booking: 10 };
    // Orígenes de una noche ocupada. Los cuatro canales van siempre en este orden en los gráficos.
    var SRC = {
        booking: { label: 'Booking.com' }, airbnb: { label: 'Airbnb' }, vrbo: { label: 'Vrbo' },
        direct: { label: 'Reserva directa' }, block: { label: 'Bloqueo' }, held: { label: 'No disponible' }
    };
    var CHANNELS = ['booking', 'airbnb', 'vrbo', 'direct'];
    var CUSTOM = 'Fechas personalizadas';                     // nombre de los periodos que se crean eligiendo días en el calendario
    var MAX_RULES = 200;                                      // el servidor no guarda más periodos que estos
    var NOTICES = [[0, 'Se puede reservar para el mismo día'], [1, '1 día'], [2, '2 días'], [3, '3 días'], [5, '5 días'], [7, '7 días'], [14, '14 días']];
    var WINDOWS = [[0, 'Todo el calendario (18 meses)'], [3, 'Próximos 3 meses'], [6, 'Próximos 6 meses'], [9, 'Próximos 9 meses'], [12, 'Próximos 12 meses']];
    var OFFERS = { weekly: 'Descuento semanal', monthly: 'Descuento mensual', early: 'Descuento por reserva anticipada', last: 'Descuento de última hora' };
    // El panel tiene dos niveles. Primero se elige un alojamiento (página "alojamientos") y después se
    // trabaja solo con él: su gestión (MANAGE) y las secciones de su anuncio (TABS, página "editor").
    // Lo que es común a todos los alojamientos está en "ajustes".
    var MANAGE = ['panel', 'reservas', 'calendario'];
    var TABS = [['general', 'General', 'fa-circle-info', 'Nombre, tipo, capacidad, camas, textos y publicación en la web.'],
        ['precios', 'Precios', 'fa-tags', 'Tarifa general, descuentos y precios por fechas.'],
        ['disponibilidad', 'Disponibilidad', 'fa-calendar-check', 'Duración de las estancias, antelación y días de entrada.'],
        ['servicios', 'Servicios', 'fa-bell-concierge', 'Lo que ofrece el alojamiento y lo que se destaca en la ficha.'],
        ['fotos', 'Fotos', 'fa-images', 'Galería y foto de portada.'],
        ['normas', 'Normas y ubicación', 'fa-clipboard-list', 'Horarios, normas de la casa, cancelación y mapa.'],
        ['opiniones', 'Opiniones', 'fa-star', 'Valoraciones copiadas de sus anuncios en las plataformas.'],
        ['sync', 'iCal y enlaces', 'fa-rotate', 'Calendarios de Airbnb, Vrbo y Booking y enlaces a sus anuncios.']];
    var PAGES = { alojamientos: ['Alojamientos', 'fa-house'], ajustes: ['Ajustes generales', 'fa-gear'],
        panel: ['Resumen', 'fa-chart-pie'], reservas: ['Reservas', 'fa-book'], calendario: ['Calendario', 'fa-calendar-days'] };
    var ERRORS = {
        wrong_password: 'Contraseña incorrecta.',
        too_many_attempts: 'Demasiados intentos. Espere 15 minutos y vuelva a probar.',
        invalid_data: 'Los datos no tienen el formato esperado.',
        invalid_id: 'Hay un alojamiento con un identificador no válido.',
        duplicate_id: 'Hay dos alojamientos con el mismo identificador.',
        duplicate_slug: 'Hay dos alojamientos con la misma dirección web. Cambie una de ellas en la sección General del alojamiento.',
        too_large: 'Los datos ocupan demasiado. Reduzca textos u opiniones.',
        store_error: 'No se ha podido conectar con el almacén de datos. Inténtelo de nuevo en unos minutos.',
        network: 'No hay conexión con el servidor. Compruebe su conexión e inténtelo de nuevo.'
    };

    // ── Utilidades ──
    function iso(d) { return d.toISOString().slice(0, 10); }
    function date(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])); }
    function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ''); }
    function addDays(s, n) { return iso(new Date(date(s).getTime() + n * DAY)); }
    function addMonths(s, n) { var d = date(s); return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))); }
    function diff(a, b) { return Math.round((date(b) - date(a)) / DAY); }
    function human(s, noYear) { return date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: noYear ? undefined : 'numeric', timeZone: 'UTC' }); }
    function monthName(s) { var m = date(s).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }); return m.charAt(0).toUpperCase() + m.slice(1); }
    function money(n) { n = Number(n) || 0; var dec = n % 1 ? 2 : 0; return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n); }
    function decimal(n) { return (Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
    function nights(n) { return n + (n === 1 ? ' noche' : ' noches'); }
    function relative(d) { var n = diff(today, d); return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 1 ? 'en ' + n + ' días' : n === -1 ? 'ayer' : 'hace ' + (-n) + ' días'; }
    function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function fa(name) { return '<i class="' + (/fa-(brands|regular|solid)/.test(name) ? '' : 'fa-solid ') + esc(name) + '" aria-hidden="true"></i>'; }
    function copy(o, extra) { var out = {}, k; for (k in o) out[k] = o[k]; for (k in extra || {}) out[k] = extra[k]; return out; }
    function slugify(s) {
        return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    }
    function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, st.data); }
    function set(path, value) {
        var keys = path.split('.'), last = keys.pop();
        var target = keys.reduce(function (o, k) { if (o[k] == null) o[k] = {}; return o[k]; }, st.data);
        target[last] = value;
    }
    function propName(p) { return (p.name.es || 'Sin nombre').split(' | ')[0]; }
    // Alojamiento elegido, o null si todavía no se ha elegido ninguno.
    function current() { return st.prop == null ? null : st.data.properties[st.prop] || null; }
    function indexOfId(id) {
        for (var i = 0; i < st.data.properties.length; i++) if (st.data.properties[i].id === id) return i;
        return null;
    }
    function tabOf(id) { return TABS.filter(function (t) { return t[0] === id; })[0]; }
    function thumb(p, src) { return p.thumbs && !/^https:/i.test(src) ? src.replace(/([^\/]+)$/, 'thumbs/$1') : src; }
    function ruleOk(r) { return isDate(r.start) && isDate(r.end) && r.end >= r.start; }
    function srcTag(src, text) { return '<span class="ad-src is-' + src + '">' + esc(text || SRC[src].label) + '</span>'; }

    // ── Noches ocupadas ──
    // Reservas directas, bloqueos y eventos de las plataformas se convierten en tramos de noches
    // que no se solapan. Si varias fuentes cubren la misma noche (las plataformas se copian los
    // cierres entre sí al sincronizarse), se queda con ella la más fiable: reserva directa,
    // reserva de Airbnb o Vrbo, bloqueo suyo, Booking (no distingue reservas de cierres) y, por
    // último, los "no disponible" de las plataformas.
    var cache = {};
    function invalidate() { cache = {}; }
    function isHeld(e) { return e.source !== 'booking' && /not available|unavailable|block|closed|no disponible/i.test(e.summary || ''); }
    function segmentsOf(p) {
        var key = 's:' + p.id;
        if (cache[key]) return cache[key];
        var items = [], owned = {}, out = [];
        p.blocked.forEach(function (b, i) {
            if (!isDate(b.start) || !isDate(b.end) || b.end <= b.start) return;
            items.push(b.type === 'booking' ? { src: 'direct', rank: 0, start: b.start, end: b.end, ref: i, label: b.guest || 'Reserva directa' }
                : { src: 'block', rank: 2, start: b.start, end: b.end, ref: i, label: b.note || 'Bloqueado por usted' });
        });
        ((st.events[p.id] || {}).events || []).forEach(function (e) {
            if (!isDate(e.start) || !isDate(e.end)) return;
            var held = isHeld(e);
            items.push({ src: held ? 'held' : e.source, platform: e.source, rank: held ? 4 : e.source === 'booking' ? 3 : 1, start: e.start, end: e.end, label: e.summary || '', url: e.url || '' });
        });
        items.sort(function (a, b) { return a.rank - b.rank || (a.start < b.start ? -1 : a.start > b.start ? 1 : 0); });
        items.forEach(function (it) {
            var run = null, d = it.start;
            for (var n = 0; n < 800 && d <= it.end; n++, d = addDays(d, 1)) {
                if (d < it.end && !owned[d]) { owned[d] = true; run = run || d; }
                else if (run) { out.push(copy(it, { start: run, end: d })); run = null; }
            }
        });
        out.sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
        return (cache[key] = out);
    }
    function nightMap(p) {
        var key = 'm:' + p.id;
        if (!cache[key]) {
            var map = cache[key] = {};
            segmentsOf(p).forEach(function (s) { for (var d = s.start; d < s.end; d = addDays(d, 1)) map[d] = s; });
        }
        return cache[key];
    }
    function isChannel(src) { return CHANNELS.indexOf(src) >= 0; }
    function overlap(s, from, to) { var a = s.start > from ? s.start : from, b = s.end < to ? s.end : to; return b > a ? diff(a, b) : 0; }
    function occupancy30(p) {
        var end = addDays(today, 30);
        return segmentsOf(p).reduce(function (n, s) { return n + (isChannel(s.src) ? overlap(s, today, end) : 0); }, 0);
    }
    function connected(p) {
        var ev = st.events[p.id];
        if (ev) return Object.keys(ev.sources).some(function (k) { return ev.sources[k] === 'ok'; });
        return Object.keys(p.ical).some(function (k) { return p.ical[k]; });
    }

    // ── Calidad del anuncio ──
    function quality(p) {
        var checks = [
            ['Al menos 15 fotos', p.gallery.length >= 15, 'fotos'],
            ['Descripción de la foto de portada', !!(p.imageAlt.es && p.imageAlt.en), 'fotos'],
            ['Título en español e inglés', !!(p.name.es && p.name.en), 'general'],
            ['Descripción de más de 300 caracteres en los dos idiomas', p.description.es.length >= 300 && p.description.en.length >= 300, 'general'],
            ['Resumen corto en los dos idiomas', !!(p.summary.es && p.summary.en), 'general'],
            ['Tipo de alojamiento', !!p.type, 'general'],
            ['Número de registro turístico', !!p.license, 'general'],
            ['Distribución de camas', p.rooms.some(function (r) { return Object.keys(r.beds).some(function (k) { return r.beds[k] > 0; }); }), 'general'],
            ['Precio base por noche', p.price.base > 0, 'precios'],
            ['Al menos 10 servicios marcados', p.services.length >= 10, 'servicios'],
            ['Tres servicios destacados o más', p.featured.length >= 3, 'servicios'],
            ['Horas de entrada y salida', !!(p.checkIn && p.checkOut), 'normas'],
            ['Normas de la casa', Object.keys(p.house).some(function (k) { return p.house[k]; }), 'normas'],
            ['Política de cancelación', !!p.cancellation, 'normas'],
            ['Ubicación en el mapa', !!p.mapQuery, 'normas'],
            ['Al menos 3 opiniones', p.reviews.length >= 3, 'opiniones'],
            ['Algún calendario de plataforma conectado', connected(p), 'sync'],
            ['Enlaces a sus anuncios', Object.keys(p.links).some(function (k) { return p.links[k]; }), 'sync']
        ];
        var done = checks.filter(function (c) { return c[1]; }).length;
        return { checks: checks, done: done, total: checks.length, percent: Math.round(done / checks.length * 100) };
    }

    // ── Servidor ──
    function api(method, body) {
        return fetch('/api/admin', {
            method: method,
            credentials: 'same-origin',
            headers: body ? { 'Content-Type': 'application/json' } : {},
            body: body ? JSON.stringify(body) : undefined
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; });
        }, function () { return { status: 0, error: 'network' }; });
    }
    function message(res) { return ERRORS[res.error] || 'Ha ocurrido un error inesperado (' + (res.error || res.status) + ').'; }

    var toastTimer;
    function toast(text, isError) {
        var el = document.querySelector('.ad-toast') || document.body.appendChild(document.createElement('div'));
        el.className = 'ad-toast' + (isError ? ' is-error' : '');
        el.setAttribute('role', 'status');
        el.innerHTML = fa(isError ? 'fa-circle-exclamation' : 'fa-circle-check') + esc(text);
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.hidden = true; }, isError ? 7000 : 3500);
    }

    // ── Datos ──
    function emptyProperty(name) {
        var n = 1, ids = st.data ? st.data.properties.map(function (p) { return p.id; }) : [];
        while (ids.indexOf('casa-' + n) >= 0) n++;
        return {
            id: 'casa-' + n, slug: slugify(name) || 'casa-' + n, hidden: true,
            name: { es: name, en: name }, type: '', location: { es: '', en: '' }, province: 'Málaga', license: '',
            image: '', imageAlt: { es: '', en: '' }, thumbs: false, gallery: [],
            summary: { es: '', en: '' }, guests: 2, bedrooms: 1, bathrooms: 1, toilets: 0, rooms: [],
            description: { es: '', en: '' }, services: [], featured: [], extraServices: [],
            locationText: { es: '', en: '' }, mapQuery: '', mapZoom: 14, checkIn: '15:00', checkOut: '10:00',
            house: { pets: '', smoking: '', parties: '', children: '', quiet: '' }, cancellation: '',
            pets: { es: '', en: '' },
            price: { base: 0, rules: [], seasons: [], cleaningFee: 0, minNights: 1, approx: false,
                discounts: { weekly: 0, monthly: 0, earlyDays: 60, earlyPercent: 0, lastDays: 3, lastPercent: 0 },
                extraGuestAfter: 0, extraGuestFee: 0, deposit: 0 },
            stay: { maxNights: 0, notice: 0, window: 0, prep: 0, checkinDays: [] },
            reviews: [], links: { airbnb: '', vrbo: '', booking: '' },
            ical: { airbnb: '', vrbo: '', booking: '' }, blocked: [], demoBusy: []
        };
    }
    // Completa los campos que falten y convierte los datos del formato antiguo (servicios
    // escritos a mano y temporadas por mes-día) a la selección del catálogo. Devuelve true si convirtió algo.
    function normalize(data) {
        var converted = false;
        data.contact = data.contact || {};
        data.properties = (data.properties || []).map(function (p) {
            if (!Array.isArray(p.services)) {
                var legacy = C.fromLegacy(p);
                p.services = legacy.services; p.featured = legacy.featured; p.extraServices = legacy.extras;
                converted = true;
            }
            p.price = p.price || {};
            if (!Array.isArray(p.price.rules)) { p.price.rules = C.seasonsToRules(p.price.seasons); converted = true; }
            p.price.seasons = [];
            // Un alojamiento que ya existía sigue visible; solo los recién creados nacen ocultos.
            if (p.hidden == null) p.hidden = false;
            var base = emptyProperty('');
            Object.keys(base).forEach(function (k) {
                if (p[k] == null) p[k] = base[k];
                else if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
                    Object.keys(base[k]).forEach(function (j) { if (p[k][j] == null) p[k][j] = base[k][j]; });
                }
            });
            // Un descuento sin porcentaje no se aplica; los días por defecto solo evitan un selector vacío.
            if (!p.price.discounts.earlyDays) p.price.discounts.earlyDays = 60;
            if (!p.price.discounts.lastDays) p.price.discounts.lastDays = 3;
            p.rooms.forEach(function (r) { r.beds = r.beds || {}; C.beds.forEach(function (b) { r.beds[b.id] = r.beds[b.id] || 0; }); });
            p.blocked.forEach(function (b) { if (b.type !== 'booking') b.type = 'block'; });
            p.price.rules.forEach(function (r) { r.days = r.days || []; r.discount = r.discount || 0; });
            return p;
        });
        return converted;
    }
    function touch() {
        st.dirty = true;
        st.failed = false;
        invalidate();
        renderTop();
        renderNav();
    }
    window.addEventListener('beforeunload', function (e) {
        if (st.dirty && st.data) { e.preventDefault(); e.returnValue = ''; }
    });

    // ── Acceso y carga ──
    function renderSetup(code) {
        var steps = code === 'store_not_configured'
            ? '<li>Entre en <strong>vercel.com</strong>, abra el proyecto de la web y vaya a <strong>Storage</strong>.</li>' +
              '<li>Pulse <strong>Create Database</strong>, elija <strong>Upstash → Redis</strong> (plan gratuito) y conéctela al proyecto.</li>' +
              '<li>Vuelva a publicar la web (<strong>Deployments → Redeploy</strong>) y recargue esta página.</li>'
            : '<li>Entre en <strong>vercel.com</strong>, abra el proyecto de la web y vaya a <strong>Settings → Environment Variables</strong>.</li>' +
              '<li>Cree la variable <code>ADMIN_PASSWORD</code> con la contraseña que quiera usar (mínimo 10 caracteres).</li>' +
              '<li>Vuelva a publicar la web (<strong>Deployments → Redeploy</strong>) y recargue esta página.</li>';
        root.innerHTML = '<div class="ad-login ad-setup"><h1>Falta un paso de configuración</h1>' +
            '<p>' + (code === 'store_not_configured' ? 'El panel todavía no tiene dónde guardar los datos.' : 'El panel todavía no tiene contraseña.') + '</p>' +
            '<ol>' + steps + '</ol></div>';
    }
    function renderLogin(then) {
        root.innerHTML = '<form class="ad-login"><img src="LOGO.png" alt="Vellum Costa">' +
            '<h1>Panel de alojamientos</h1><p>Acceso privado. Introduzca su contraseña.</p>' +
            // Campo de usuario oculto: los gestores de contraseñas lo necesitan para guardar el acceso.
            '<input type="text" name="username" autocomplete="username" value="admin" hidden>' +
            '<input type="password" name="password" autocomplete="current-password" aria-label="Contraseña" placeholder="Contraseña" required>' +
            '<button type="submit" class="ad-btn ad-btn-solid">Entrar</button>' +
            '<p class="ad-error" role="alert" hidden></p></form>';
        var form = root.querySelector('form'), password = form.querySelector('input[type="password"]'), error = form.querySelector('.ad-error'), button = form.querySelector('button');
        password.focus();
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            button.disabled = true;
            button.innerHTML = fa('fa-spinner fa-spin') + 'Entrando…';
            api('POST', { action: 'login', password: password.value }).then(function (res) {
                if (res.status === 200) return then();
                if (res.error === 'store_not_configured' || res.error === 'password_not_configured') return renderSetup(res.error);
                button.disabled = false;
                button.textContent = 'Entrar';
                error.textContent = message(res);
                error.hidden = false;
                password.select();
            });
        });
    }
    function load() {
        api('GET').then(function (res) {
            if (res.status === 401) return renderLogin(load);
            if (res.error === 'store_not_configured' || res.error === 'password_not_configured') return renderSetup(res.error);
            if (res.status !== 200) { root.innerHTML = '<p class="ad-loading ad-error">' + esc(message(res)) + '</p>'; return; }
            // La primera vez no hay nada guardado: se parte de propiedades-data.js.
            st.fresh = !res.data;
            st.data = res.data || JSON.parse(JSON.stringify(window.VELLUM_PROPERTIES || { demo: true, contact: {}, properties: [] }));
            st.dirty = normalize(st.data) || st.fresh;
            st.failed = false;
            st.form = st.rule = st.pick = st.range = st.seg = null;
            invalidate();
            route();
            st.sync = 'loading';
            render();
            loadEvents();
        });
    }
    // Reservas y cierres de Airbnb, Vrbo y Booking (se leen de sus calendarios iCal).
    var eventsRun = 0;
    function loadEvents() {
        // Si se pide otra lectura antes de que termine esta, solo cuenta la última.
        var run = ++eventsRun;
        st.sync = 'loading';
        fetch('/api/admin?events=1&t=' + Date.now(), { credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (d) { if (run === eventsRun) { st.events = d.events || {}; st.eventsAt = d.at || ''; st.sync = 'ok'; } }, function () { if (run === eventsRun) st.sync = 'error'; })
            .then(function () {
                if (run !== eventsRun) return;
                invalidate();
                if (!st.data || !root.querySelector('.ad-main')) return;
                renderNav();
                // No se repinta mientras se escribe en un campo: se perdería el foco.
                var active = document.activeElement;
                if (!(active && root.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName))) renderMain();
            });
    }
    // Avisa de lo que el servidor descartaría en silencio.
    function problem() {
        for (var i = 0; i < st.data.properties.length; i++) {
            var p = st.data.properties[i];
            if (p.price.rules.length > MAX_RULES) {
                st.page = 'calendario'; st.prop = i;
                return '«' + propName(p) + '» tiene ' + p.price.rules.length + ' periodos de precio y el máximo es ' + MAX_RULES + '. Elimine los que ya no necesite en «Periodos y temporadas».';
            }
            for (var j = 0; j < p.price.rules.length; j++) {
                if (!ruleOk(p.price.rules[j])) {
                    st.page = 'calendario'; st.prop = i; st.rule = j;
                    return 'Revise las fechas del precio «' + (p.price.rules[j].name || 'sin nombre') + '»: la fecha final no puede ser anterior a la inicial.';
                }
            }
            if (p.stay.maxNights && p.stay.maxNights < p.price.minNights) {
                st.page = 'editor'; st.prop = i; st.tab = 'disponibilidad';
                return 'En «' + propName(p) + '» la estancia máxima es menor que la mínima.';
            }
        }
        return '';
    }
    function save() {
        if (st.saving || !st.dirty) return;
        var issue = problem();
        if (issue) { render(); remember(true); return toast(issue, true); }
        st.saving = true;
        st.failed = false;
        renderTop();
        api('POST', { action: 'save', data: st.data }).then(function (res) {
            st.saving = false;
            if (res.status === 401) return renderLogin(function () { render(); save(); });
            if (res.status !== 200) { st.failed = true; renderTop(); return toast(message(res), true); }
            // El alojamiento abierto se busca de nuevo por su identificador en lo que devuelve el servidor.
            var open = current() ? current().id : null;
            st.data = res.data;
            normalize(st.data);
            st.dirty = st.fresh = false;
            st.rule = st.form = null;
            st.prop = open == null ? null : indexOfId(open);
            invalidate();
            render();
            toast('Guardado. Los cambios se verán en la web en un minuto aproximadamente.');
            loadEvents();
        });
    }

    // ── Controles de formulario ──
    // kind: text (por defecto), number, area, date, check (interruptor), select, selectnum, stepper
    function field(label, path, o) {
        o = o || {};
        var kind = o.kind || 'text', v = get(path);
        if (v == null) v = '';
        var attrs = ' data-path="' + path + '" data-kind="' + kind + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '');
        var help = o.help ? '<span class="ad-help">' + o.help + '</span>' : '';
        if (kind === 'check') return '<label class="ad-check"><input type="checkbox" role="switch"' + attrs + (v ? ' checked' : '') + '><span>' + label + (help ? '<br>' + help : '') + '</span></label>';
        if (kind === 'stepper') {
            var min = o.min || 0, max = o.max || 99;
            var btn = function (d, text, name) { return '<button type="button" data-act="step" data-path="' + path + '" data-d="' + d + '" data-min="' + min + '" data-max="' + max + '" aria-label="' + name + ' ' + esc(label.toLowerCase()) + '"' + ((d < 0 ? v <= min : v >= max) ? ' disabled' : '') + '>' + text + '</button>'; };
            return '<div class="ad-field"><span class="ad-label">' + label + '</span><div class="ad-stepper">' + btn(-1, '−', 'Menos') + '<output>' + esc(o.zero && !v ? o.zero : v) + '</output>' + btn(1, '+', 'Más') + '</div>' + help + '</div>';
        }
        var control;
        if (kind === 'area') {
            control = '<textarea rows="' + (o.rows || 3) + '"' + attrs + '>' + esc(v) + '</textarea>';
            if (o.count) help = '<span class="ad-help" data-count="' + path + '">' + String(v).length + ' caracteres</span>' + help;
        } else if (kind === 'select' || kind === 'selectnum') {
            var options = o.options.slice();
            // Un valor guardado que no está en la lista no se pierde: se añade como opción.
            if (v !== '' && !options.some(function (op) { return String(op[0]) === String(v); })) options.push([v, v]);
            control = '<select' + attrs + '>' + options.map(function (op) {
                return '<option value="' + esc(op[0]) + '"' + (String(op[0]) === String(v) ? ' selected' : '') + '>' + esc(op[1]) + '</option>';
            }).join('') + '</select>';
        } else if (kind === 'number') {
            control = '<input type="number" inputmode="decimal" step="any" min="' + (o.min || 0) + '"' + (o.max ? ' max="' + o.max + '"' : '') + attrs + ' value="' + esc(v) + '">';
            if (o.unit) control = '<span class="ad-unit">' + control + '<span>' + o.unit + '</span></span>';
        } else {
            control = '<input type="' + (kind === 'date' ? 'date' : 'text') + '"' + attrs + ' value="' + esc(v) + '">';
        }
        return '<label class="ad-field"><span class="ad-label">' + label + '</span>' + control + help + '</label>';
    }
    function bi(label, path, o) {
        return '<div class="ad-bi">' + field(label + ' · Español', path + '.es', o) + field(label + ' · English', path + '.en', o) + '</div>';
    }
    // Botones de opción: "set" elige una (pulsar la activa la desmarca) y "toggle" marca varias.
    function seg(label, path, options, o) {
        o = o || {};
        var v = get(path), many = Array.isArray(v);
        return '<div class="ad-field"><span class="ad-label">' + label + '</span><div class="ad-seg" role="group" aria-label="' + esc(label) + '">' + options.map(function (op) {
            var on = many ? v.indexOf(op[0]) >= 0 : String(v == null ? '' : v) === String(op[0]);
            return '<button type="button" class="' + (on ? 'is-on' : '') + '" aria-pressed="' + on + '" data-act="' + (many ? 'toggle' : 'set') + '" data-path="' + path + '" data-value="' + esc(op[0]) + '"' +
                (o.num ? ' data-num="1"' : '') + (o.keep ? ' data-keep="1"' : '') + '>' + esc(op[1]) + '</button>';
        }).join('') + '</div>' + (o.help ? '<span class="ad-help">' + o.help + '</span>' : '') + '</div>';
    }
    function grid() { return '<div class="ad-grid">' + Array.prototype.join.call(arguments, '') + '</div>'; }
    function card(title, html, help, icon) {
        return '<section class="ad-card">' + (title ? '<h3>' + (icon ? fa(icon) : '') + title + '</h3>' : '') + (help ? '<p class="ad-help">' + help + '</p>' : '') + html + '</section>';
    }
    function tools(listPath, i, n, move) {
        return '<div class="ad-row-tools">' +
            (move ? '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + listPath + '" data-i="' + i + '" data-d="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>' + fa('fa-arrow-up') + '</button>' +
                '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + listPath + '" data-i="' + i + '" data-d="1" aria-label="Bajar"' + (i === n - 1 ? ' disabled' : '') + '>' + fa('fa-arrow-down') + '</button>' : '') +
            '<button type="button" class="ad-icon-btn is-danger" data-act="del" data-list="' + listPath + '" data-i="' + i + '" aria-label="Eliminar">' + fa('fa-trash') + '</button></div>';
    }
    // Lista editable: una fila por elemento, con sus botones, y el botón de añadir.
    function rows(listPath, kind, addLabel, rowHtml, o) {
        o = o || {};
        var items = get(listPath) || [];
        return (items.length ? items.map(function (item, i) {
            return '<div class="ad-row' + (o.tall ? ' is-tall' : '') + '"><div class="ad-row-body">' + rowHtml(listPath + '.' + i, item) + '</div>' + tools(listPath, i, items.length, o.move) + '</div>';
        }).join('') : '<p class="ad-empty">' + (o.empty || 'Todavía no hay ninguno.') + '</p>') +
            '<button type="button" class="ad-btn ad-btn-small ad-add" data-act="add" data-list="' + listPath + '" data-new="' + kind + '">' + fa('fa-plus') + addLabel + '</button>';
    }
    var NEW = {
        rule: function (p) { return { name: C.ruleNames[0], start: today, end: addDays(today, 6), price: p.price.base, discount: 0, minNights: 0, days: [], repeat: false }; },
        extra: function () { return { es: '', en: '' }; },
        room: function () { var beds = {}; C.beds.forEach(function (b) { beds[b.id] = b.id === 'double' ? 1 : 0; }); return { kind: 'bedroom', beds: beds }; },
        review: function () { return { source: 'airbnb', name: '', date: monthLabel(now.getMonth(), now.getFullYear()), rating: 5, max: 5, text: '' }; }
    };
    function monthLabel(m, y) { return { es: MONTHS[m][0] + ' de ' + y, en: MONTHS[m][1] + ' ' + y }; }
    function times() {
        var out = [['', 'Sin indicar']];
        for (var h = 6; h < 24; h++) { out.push([pad(h) + ':00', pad(h) + ':00']); out.push([pad(h) + ':30', pad(h) + ':30']); }
        return out;
    }
    function meter(percent, cls) { return '<div class="ad-meter' + (cls ? ' ' + cls : '') + '"><i style="width:' + Math.max(0, Math.min(100, percent)) + '%"></i></div>'; }
    function tip(title, rowsOf, foot) { return ' data-tip="' + esc(JSON.stringify({ t: title, r: rowsOf || [], f: foot || '' })) + '"'; }
    function syncChips(p) {
        var info = st.events[p.id];
        return Object.keys(REVIEWS).map(function (k) {
            var s = info ? info.sources[k] : '';
            var text = !info ? (st.sync === 'loading' ? 'consultando…' : 'sin datos') : s === 'ok' ? 'conectado' : s === 'error' ? 'error al leer el calendario' : 'sin conectar';
            return '<span class="ad-chip' + (s === 'ok' ? ' is-ok' : s === 'error' ? ' is-error' : '') + '">' + fa(s === 'ok' ? 'fa-circle-check' : s === 'error' ? 'fa-circle-exclamation' : 'fa-circle-minus') + REVIEWS[k] + ': ' + text + '</span>';
        }).join('');
    }

    // ══ Resumen ══
    function metrics(p) {
        var end30 = addDays(today, 30), end365 = addDays(today, 365), year = today.slice(0, 4), first = today.slice(0, 8) + '01';
        var m = { booked30: 0, nights: 0, bookings: 0, next: null, byChannel: {}, direct: 0, directCount: 0, unpaid: 0, moves: [], months: [] };
        CHANNELS.forEach(function (k) { m.byChannel[k] = 0; });
        for (var k = 0; k < 12; k++) {
            var month = { start: addMonths(first, k), values: {} };
            month.end = addMonths(month.start, 1);
            CHANNELS.forEach(function (c) { month.values[c] = 0; });
            m.months.push(month);
        }
        segmentsOf(p).forEach(function (s) {
            if (!isChannel(s.src)) return;
            m.booked30 += overlap(s, today, end30);
            var n = overlap(s, today, end365);
            if (n) { m.nights += n; m.bookings++; m.byChannel[s.src] += n; }
            m.months.forEach(function (mo) { mo.values[s.src] += overlap(s, mo.start, mo.end); });
            if (s.start >= today && (!m.next || s.start < m.next.start)) m.next = s;
            if (s.start >= today && s.start <= end30) m.moves.push({ date: s.start, arrival: true, s: s });
            if (s.end >= today && s.end <= end30) m.moves.push({ date: s.end, arrival: false, s: s });
        });
        p.blocked.forEach(function (b) {
            if (b.type !== 'booking' || String(b.start).slice(0, 4) !== year) return;
            m.direct += Number(b.total) || 0;
            m.directCount++;
            if (b.paid !== 'paid') m.unpaid++;
        });
        m.moves.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.arrival === b.arrival ? 0 : a.arrival ? 1 : -1); });
        return m;
    }
    function kpi(tint, icon, label, value, sub, extra) {
        return '<article class="ad-kpi"><span class="ad-kpi-icon t-' + tint + '">' + fa(icon) + '</span><div class="ad-kpi-body"><p class="ad-kpi-label">' + label + '</p>' +
            '<p class="ad-kpi-value">' + value + '</p>' + (extra || '') + '<p class="ad-kpi-sub">' + sub + '</p></div></article>';
    }
    function tableToggle(key) {
        return '<button type="button" class="ad-btn ad-btn-small ad-btn-ghost" data-act="table" data-key="' + key + '" aria-pressed="' + !!st.table[key] + '">' + fa(st.table[key] ? 'fa-chart-column' : 'fa-table') + (st.table[key] ? 'Ver gráfico' : 'Ver tabla') + '</button>';
    }
    function legend(keys) {
        return '<p class="ad-legend">' + keys.map(function (k) { return '<span><i class="ad-key is-' + k + '"></i>' + SRC[k].label + '</span>'; }).join('') + '</p>';
    }
    // Noches reservadas por mes, apiladas por canal.
    function occupancyChart(m) {
        var top = 31, ticks = [0, 10, 20, 30];
        var abbr = function (mo, i) { var d = date(mo.start), name = MONTHS[d.getUTCMonth()][0].slice(0, 3); return name + (i === 0 || d.getUTCMonth() === 0 ? ' ' + String(d.getUTCFullYear()).slice(2) : ''); };
        var totalOf = function (mo) { return CHANNELS.reduce(function (n, c) { return n + mo.values[c]; }, 0); };
        var share = function (mo) { return Math.round(totalOf(mo) / diff(mo.start, mo.end) * 100); };
        var body;
        if (st.table.occ) {
            body = '<div class="ad-table-wrap" style="margin:0"><table class="ad-table"><thead><tr><th>Mes</th>' + CHANNELS.map(function (c) { return '<th class="num">' + SRC[c].label + '</th>'; }).join('') + '<th class="num">Noches</th><th class="num">Ocupación</th></tr></thead><tbody>' +
                m.months.map(function (mo) {
                    return '<tr><td><strong>' + esc(monthName(mo.start)) + '</strong></td>' + CHANNELS.map(function (c) { return '<td class="num" data-label="' + SRC[c].label + '">' + mo.values[c] + '</td>'; }).join('') +
                        '<td class="num" data-label="Noches">' + totalOf(mo) + '</td><td class="num" data-label="Ocupación">' + share(mo) + ' %</td></tr>';
                }).join('') + '</tbody></table></div>';
        } else {
            body = '<div class="ad-chart"><div class="ad-chart-y" aria-hidden="true">' + ticks.map(function (t) { return '<span style="bottom:' + (t / top * 100) + '%">' + t + '</span>'; }).join('') + '</div>' +
                '<div class="ad-chart-plot">' + ticks.slice(1).map(function (t) { return '<i class="ad-chart-grid" style="bottom:' + (t / top * 100) + '%"></i>'; }).join('') +
                m.months.map(function (mo) {
                    var rowsOf = CHANNELS.map(function (c) { return [c, SRC[c].label, String(mo.values[c])]; });
                    return '<div class="ad-col" tabindex="0" role="img" aria-label="' + esc(monthName(mo.start) + ': ' + nights(totalOf(mo)) + ', ' + share(mo) + ' % de ocupación') + '"' +
                        tip(monthName(mo.start), rowsOf, 'Ocupación: ' + share(mo) + ' %') + '><div class="ad-col-stack">' +
                        CHANNELS.map(function (c) { return mo.values[c] ? '<b class="is-' + c + '-fill" style="height:' + (mo.values[c] / top * 100) + '%"></b>' : ''; }).join('') + '</div></div>';
                }).join('') + '</div>' +
                '<div class="ad-chart-x" aria-hidden="true">' + m.months.map(function (mo, i) { return '<span>' + abbr(mo, i) + '</span>'; }).join('') + '</div></div>' + legend(CHANNELS);
        }
        return '<section class="ad-card span-8"><div class="ad-card-head"><h3>' + fa('fa-chart-column') + 'Noches reservadas por mes</h3>' + tableToggle('occ') +
            '<p class="ad-help">Próximos 12 meses, según los calendarios de las plataformas y sus reservas directas.</p></div>' + body + '</section>';
    }
    // Reparto de las noches reservadas entre canales.
    function channelChart(m) {
        var total = m.nights, offset = 0, used = CHANNELS.filter(function (c) { return m.byChannel[c] > 0; });
        var gap = used.length > 1 ? 0.8 : 0;
        var ring = used.map(function (c) {
            var len = m.byChannel[c] / total * 100, start = offset, drawn = Math.max(0.5, len - gap);
            offset += len;
            return '<circle class="seg is-' + c + '" cx="80" cy="80" r="60" pathLength="100" stroke-dasharray="' + drawn + ' ' + (100 - drawn) + '" stroke-dashoffset="' + (-start) + '" tabindex="0" role="img" aria-label="' +
                esc(SRC[c].label + ': ' + nights(m.byChannel[c])) + '"' + tip(SRC[c].label, [[c, 'noches', String(m.byChannel[c])]], Math.round(len) + ' % del total') + '></circle>';
        }).join('');
        var list = '<div class="ad-rows">' + CHANNELS.map(function (c) {
            return '<div><i class="ad-key is-' + c + '"></i>' + SRC[c].label + '<strong>' + m.byChannel[c] + '</strong><em>' + (total ? Math.round(m.byChannel[c] / total * 100) : 0) + ' %</em></div>';
        }).join('') + '</div>';
        return '<section class="ad-card span-4"><div class="ad-card-head"><h3>' + fa('fa-chart-pie') + 'Noches por canal</h3><p class="ad-help">Próximos 12 meses.</p></div>' +
            '<div class="ad-donut-wrap"><div class="ad-donut"><svg viewBox="0 0 160 160"><circle class="track" cx="80" cy="80" r="60"></circle>' + ring + '</svg>' +
            '<div class="ad-donut-center"><strong>' + total + '</strong><span>noches</span></div></div>' + list + '</div></section>';
    }
    function movesCard(m) {
        var items = m.moves.slice(0, 7).map(function (x) {
            var d = date(x.date);
            return '<div class="ad-move"><div class="ad-move-date"><strong>' + d.getUTCDate() + '</strong><span>' + MONTHS[d.getUTCMonth()][0].slice(0, 3) + '</span></div>' +
                '<div class="ad-move-body"><strong>' + fa(x.arrival ? 'fa-right-to-bracket' : 'fa-right-from-bracket') + (x.arrival ? 'Llegada' : 'Salida') + '</strong>' +
                '<span>' + relative(x.date) + ' · ' + nights(diff(x.s.start, x.s.end)) + (x.s.src === 'direct' ? ' · ' + esc(x.s.label) : '') + '</span></div>' + srcTag(x.s.src) + '</div>';
        }).join('');
        return '<section class="ad-card span-7"><div class="ad-card-head"><h3>' + fa('fa-right-left') + 'Próximas llegadas y salidas</h3>' +
            '<button type="button" class="ad-link" data-act="go" data-page="reservas">Ver todas las reservas</button><p class="ad-help">Próximos 30 días.</p></div>' +
            (items ? '<div class="ad-moves">' + items + '</div>' : '<p class="ad-empty">No hay llegadas ni salidas en los próximos 30 días.</p>') + '</section>';
    }
    function qualityCard(p) {
        var q = quality(p), pending = q.checks.filter(function (c) { return !c[1]; });
        return '<section class="ad-card"><div class="ad-card-head"><h3>' + fa('fa-list-check') + 'Calidad del anuncio</h3></div>' +
            '<div class="ad-big"><strong>' + q.percent + ' %</strong><span>' + q.done + ' de ' + q.total + ' puntos</span></div>' + meter(q.percent) +
            (pending.length ? '<ul class="ad-todo">' + pending.slice(0, 4).map(function (c) {
                return '<li>' + fa('fa-circle') + '<span>' + c[0] + '</span><button type="button" class="ad-link" data-act="go" data-page="editor" data-tab="' + c[2] + '">Completar</button></li>';
            }).join('') + '</ul>' + (pending.length > 4 ? '<p class="ad-help">Y ' + (pending.length - 4) + ' más.</p>' : '')
                : '<p class="ad-help">' + fa('fa-circle-check') + ' Anuncio completo.</p>') + '</section>';
    }
    function ratingCard(p) {
        var all = [], by = {};
        p.reviews.forEach(function (r) { all.push(r.rating / r.max * 5); (by[r.source] = by[r.source] || []).push(r); });
        var avg = all.length ? all.reduce(function (a, b) { return a + b; }, 0) / all.length : 0;
        var html = all.length ? '<div class="ad-big"><strong>' + decimal(avg) + '</strong><span>sobre 5 · ' + all.length + (all.length === 1 ? ' opinión' : ' opiniones') + '</span></div>' +
            '<div class="ad-rows">' + Object.keys(by).map(function (k) {
                var g = by[k], mean = g.reduce(function (s, r) { return s + r.rating; }, 0) / g.length;
                return '<div>' + REVIEWS[k] + '<strong>' + decimal(mean) + ' / ' + g[0].max + '</strong><em>' + g.length + '</em></div>';
            }).join('') + '</div>' : '<p class="ad-empty">Todavía no ha copiado ninguna opinión.</p>';
        return '<section class="ad-card"><div class="ad-card-head"><h3>' + fa('fa-star') + 'Valoraciones</h3></div>' + html + '</section>';
    }
    function syncCard(p) {
        var when = st.eventsAt ? new Date(st.eventsAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
        return '<section class="ad-card"><div class="ad-card-head"><h3>' + fa('fa-rotate') + 'Calendarios conectados</h3>' +
            '<button type="button" class="ad-btn ad-btn-small" data-act="sync"' + (st.sync === 'loading' ? ' disabled' : '') + '>' + fa(st.sync === 'loading' ? 'fa-spinner fa-spin' : 'fa-rotate') + 'Sincronizar</button></div>' +
            '<div class="ad-chips">' + syncChips(p) + '</div>' +
            '<p class="ad-help">' + (st.sync === 'error' ? 'No se han podido leer los calendarios. Vuelva a intentarlo.' : st.sync === 'loading' ? 'Leyendo los calendarios…' : when ? 'Última lectura a las ' + when + '.' : 'Todavía no se han leído.') + '</p></section>';
    }
    function pagePanel() {
        var p = current(), m = metrics(p), total30 = 30, share = Math.round(m.booked30 / total30 * 100);
        var next = m.next ? '<small>' + esc(date(m.next.start).toLocaleDateString('es-ES', { weekday: 'short', timeZone: 'UTC' })) + '</small> ' + esc(human(m.next.start, true)) : 'Sin llegadas';
        var loading = st.sync === 'loading' && !st.eventsAt;
        return '<div class="ad-head"><div class="ad-head-text"><h2>Resumen</h2><p>' + esc(date(today).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })) + '</p></div>' +
            (p.hidden ? '<span class="ad-tag">' + fa('fa-eye-slash') + 'Oculto en la web</span>' : '<span class="ad-tag is-ok">' + fa('fa-circle-check') + 'Visible en la web</span>') + '</div>' +
            (st.sync === 'error' ? '<p class="ad-banner is-bad">' + fa('fa-triangle-exclamation') + '<span>No se han podido leer los calendarios de las plataformas, así que estos datos solo incluyen sus reservas directas. Pulse <strong>Sincronizar</strong> para reintentarlo.</span></p>' : '') +
            '<div class="ad-dash' + (st.sync === 'loading' ? ' is-stale' : '') + '"><div class="ad-kpis">' +
            kpi('blue', 'fa-bed', 'Ocupación (30 días)', loading ? '…' : share + ' %', loading ? 'Leyendo los calendarios…' : m.booked30 + ' de ' + total30 + ' noches reservadas', meter(loading ? 0 : share, 'is-blue')) +
            kpi('green', 'fa-right-to-bracket', 'Próxima llegada', loading ? '…' : next, loading ? 'Leyendo los calendarios…' : m.next ? relative(m.next.start) + ' · ' + SRC[m.next.src].label + ' · ' + nights(diff(m.next.start, m.next.end)) : 'No hay reservas futuras') +
            kpi('violet', 'fa-moon', 'Noches reservadas (12 meses)', loading ? '…' : String(m.nights), m.bookings + (m.bookings === 1 ? ' reserva' : ' reservas') + ' en los calendarios') +
            kpi('gold', 'fa-sack-dollar', 'Reservas directas (' + today.slice(0, 4) + ')', money(m.direct), m.directCount ? m.directCount + (m.directCount === 1 ? ' reserva' : ' reservas') + (m.unpaid ? ' · ' + m.unpaid + ' sin cobrar del todo' : ' · todo cobrado') : 'Ninguna anotada todavía') +
            '</div><div class="ad-dash-grid">' + occupancyChart(m) + channelChart(m) + movesCard(m) +
            '<div class="ad-stack-col span-5">' + qualityCard(p) + ratingCard(p) + syncCard(p) + '</div></div></div>';
    }

    // ══ Reservas directas y bloqueos ══
    function openForm(pi, type, ref, range) {
        var p = st.data.properties[pi], b = ref == null ? null : p.blocked[ref];
        var start = range ? range.a : addDays(today, 1);
        st.form = { pi: pi, ref: ref == null ? null : ref, type: b ? b.type : type,
            d: b ? copy(b) : { start: start, end: range ? addDays(range.b, 1) : addDays(start, Math.max(1, p.price.minNights)), guest: '', phone: '', guests: Math.min(2, p.guests), total: 0, paid: 'pending', channel: 'whatsapp', note: '' } };
        st.pick = st.range = st.seg = null;
    }
    // Lo que se comprueba mientras se rellena: noches, coincidencias con otras reservas y precio de tarifa.
    function formInfo() {
        var f = st.form, p = st.data.properties[f.pi], d = f.d;
        if (!isDate(d.start) || !isDate(d.end) || d.end <= d.start) return '<span class="ad-error">' + fa('fa-circle-exclamation') + ' La salida debe ser posterior a la entrada.</span>';
        var clash = segmentsOf(p).filter(function (s) { return !((s.src === 'direct' || s.src === 'block') && s.ref === f.ref) && s.start < d.end && s.end > d.start; });
        var out = '<strong>' + nights(diff(d.start, d.end)) + '</strong>';
        if (f.type === 'booking' && p.price.base > 0) {
            var q = PR.quote(p, d.start, d.end, d.guests, today);
            out += ' · Según su tarifa: <strong>' + money(q.total) + '</strong>' + (q.discount ? ' (' + OFFERS[q.discount.type].toLowerCase() + ' del ' + q.discount.percent + ' %)' : '');
        }
        if (clash.length) out += '<br><span class="ad-error">' + fa('fa-triangle-exclamation') + ' Coincide con: ' + clash.map(function (s) { return SRC[s.src].label + ' (' + human(s.start, true) + ' → ' + human(s.end, true) + ')'; }).join(', ') + '.</span>';
        return out;
    }
    function formCard() {
        var f = st.form;
        if (!f) return '';
        var d = f.d, booking = f.type === 'booking';
        var input = function (label, key, type, extra) {
            return '<label class="ad-field"><span class="ad-label">' + label + '</span><input type="' + (type || 'text') + '" data-form="' + key + '" value="' + esc(d[key] == null ? '' : d[key]) + '"' + (extra || '') + '></label>';
        };
        var select = function (label, key, options) {
            return '<label class="ad-field"><span class="ad-label">' + label + '</span><select data-form="' + key + '">' + options.map(function (o) {
                return '<option value="' + esc(o.id) + '"' + (String(d[key]) === String(o.id) ? ' selected' : '') + '>' + esc(o.label) + '</option>';
            }).join('') + '</select></label>';
        };
        return '<section class="ad-card" id="ad-form"><div class="ad-card-head"><h3>' + fa(booking ? 'fa-handshake' : 'fa-ban') + (f.ref == null ? (booking ? 'Nueva reserva directa' : 'Bloquear fechas') : (booking ? 'Editar reserva directa' : 'Editar bloqueo')) + '</h3>' +
            '<p class="ad-help">' + (booking ? 'Para reservas que le llegan por teléfono, WhatsApp o la web. Las fechas quedan ocupadas en la ficha pública.' : 'Cierra las fechas en la ficha pública sin anotar una reserva (uso propio, obras…).') + '</p></div>' +
            grid(input('Entrada', 'start', 'date'), input(booking ? 'Salida' : 'Hasta (día de reapertura)', 'end', 'date')) +
            (booking ? grid(input('Nombre del huésped', 'guest'), input('Teléfono', 'phone', 'tel'), input('Huéspedes', 'guests', 'number', ' min="1" inputmode="numeric"')) +
                grid('<label class="ad-field"><span class="ad-label">Importe total</span><span class="ad-unit"><input type="number" step="any" min="0" inputmode="decimal" data-form="total" value="' + esc(d.total) + '"><span>€</span></span></label>',
                    select('Pago', 'paid', C.payments), select('Cómo llegó', 'channel', C.channels)) : '') +
            grid(input(booking ? 'Notas privadas' : 'Motivo (privado)', 'note', 'text', ' placeholder="' + (booking ? 'Hora de llegada, peticiones…' : 'Uso propio, mantenimiento…') + '"')) +
            '<p class="ad-help" id="ad-form-info" style="margin-bottom:14px">' + formInfo() + '</p>' +
            '<div class="ad-chips"><button type="button" class="ad-btn ad-btn-solid" data-act="form-save">' + fa('fa-check') + (booking ? 'Anotar reserva' : 'Bloquear fechas') + '</button>' +
            (booking ? '<button type="button" class="ad-btn" data-act="form-quote">' + fa('fa-calculator') + 'Usar el precio de tarifa</button>' : '') +
            '<button type="button" class="ad-btn ad-btn-ghost" data-act="form-cancel">Cancelar</button></div></section>';
    }
    function reservationRows(p) {
        var out = [];
        p.blocked.forEach(function (b, i) {
            if (!isDate(b.start) || !isDate(b.end)) return;
            var channel = C.find(C.channels, b.channel);
            out.push(b.type === 'booking'
                ? { src: 'direct', start: b.start, end: b.end, ref: i, title: b.guest || 'Reserva directa', sub: [channel ? channel.label : '', b.guests ? b.guests + ' huésp.' : '', b.phone, b.note].filter(Boolean).join(' · '), total: b.total, paid: b.paid }
                : { src: 'block', start: b.start, end: b.end, ref: i, title: 'Fechas bloqueadas', sub: b.note });
        });
        segmentsOf(p).forEach(function (s) {
            if (s.src === 'direct' || s.src === 'block') return;
            var held = s.src === 'held';
            out.push({ src: s.src, start: s.start, end: s.end, url: s.url, title: held ? 'No disponible en ' + SRC[s.platform].label : s.src === 'booking' ? 'Reserva o cierre en Booking' : 'Reserva en ' + SRC[s.src].label, sub: s.label });
        });
        out = out.filter(function (r) {
            if (st.when === 'active' && r.end <= today) return false;
            if (st.when === 'past' && r.end > today) return false;
            if (st.kind === 'direct') return r.src === 'direct';
            if (st.kind === 'platform') return isChannel(r.src) && r.src !== 'direct';
            if (st.kind === 'block') return r.src === 'block' || r.src === 'held';
            return true;
        });
        var dir = st.when === 'past' ? -1 : 1;
        return out.sort(function (a, b) { return a.start < b.start ? -dir : a.start > b.start ? dir : 0; });
    }
    function filterSeg(key, options) {
        return '<div class="ad-seg" role="group">' + options.map(function (o) {
            return '<button type="button" class="' + (st[key] === o[0] ? 'is-on' : '') + '" aria-pressed="' + (st[key] === o[0]) + '" data-act="ui" data-key="' + key + '" data-value="' + o[0] + '">' + o[1] + '</button>';
        }).join('') + '</div>';
    }
    function pageReservas() {
        var list = reservationRows(current());
        var body = list.length ? '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Reserva</th><th>Canal</th><th>Entrada</th><th>Salida</th><th class="num">Noches</th><th class="num">Importe</th><th>Pago</th><th></th></tr></thead><tbody>' +
            list.map(function (r) {
                var mine = r.src === 'direct' || r.src === 'block', path = 'properties.' + st.prop + '.blocked.' + r.ref;
                var state = r.end <= today ? 'finalizada' : r.start <= today ? 'en curso' : relative(r.start);
                return '<tr><td><strong>' + esc(r.title) + '</strong><small>' + esc(r.sub || '') + '</small></td>' +
                    '<td data-label="Canal">' + srcTag(r.src) + '</td>' +
                    '<td class="nowrap" data-label="Entrada"><span>' + esc(human(r.start)) + '<small>' + state + '</small></span></td>' +
                    '<td class="nowrap" data-label="Salida">' + esc(human(r.end)) + '</td>' +
                    '<td class="num" data-label="Noches">' + diff(r.start, r.end) + '</td>' +
                    '<td class="num" data-label="Importe">' + (r.src === 'direct' ? money(r.total) : '—') + '</td>' +
                    '<td data-label="Pago">' + (r.src === 'direct' ? '<select class="ad-pill-select is-' + r.paid + '" data-path="' + path + '.paid" data-kind="select" aria-label="Estado del pago">' + C.payments.map(function (o) {
                        return '<option value="' + o.id + '"' + (o.id === r.paid ? ' selected' : '') + '>' + o.label + '</option>'; }).join('') + '</select>' : '—') + '</td>' +
                    '<td data-label="Acciones"><div class="ad-row-tools">' + (mine ? '<button type="button" class="ad-icon-btn" data-act="form-edit" data-ref="' + r.ref + '" aria-label="Editar">' + fa('fa-pen') + '</button>' +
                        '<button type="button" class="ad-icon-btn is-danger" data-act="row-del" data-ref="' + r.ref + '" aria-label="Eliminar">' + fa('fa-trash') + '</button>'
                        : r.src === 'airbnb' && /^https:\/\/www\.airbnb\./.test(r.url || '') ? '<a class="ad-icon-btn" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer" aria-label="Abrir en Airbnb" title="Abrir en Airbnb">' + fa('fa-arrow-up-right-from-square') + '</a>' : '—') + '</div></td></tr>';
            }).join('') + '</tbody></table></div>'
            : '<p class="ad-empty">No hay nada que mostrar con estos filtros.</p>';
        return '<div class="ad-head"><div class="ad-head-text"><h2>Reservas</h2><p>Todo lo que ocupa el calendario de este alojamiento: plataformas, reservas directas y bloqueos.</p></div>' +
            '<button type="button" class="ad-btn" data-act="form-new" data-type="block">' + fa('fa-ban') + 'Bloquear fechas</button>' +
            '<button type="button" class="ad-btn ad-btn-solid" data-act="form-new" data-type="booking">' + fa('fa-plus') + 'Nueva reserva directa</button></div>' +
            formCard() +
            '<div class="ad-filters">' + filterSeg('when', [['active', 'Próximas y en curso'], ['past', 'Pasadas'], ['all', 'Todas']]) +
            filterSeg('kind', [['all', 'Todos los canales'], ['direct', 'Directas'], ['platform', 'Plataformas'], ['block', 'Bloqueos']]) + '</div>' +
            '<section class="ad-card"><div class="ad-card-head"><h3>' + fa('fa-book') + list.length + (list.length === 1 ? ' resultado' : ' resultados') + '</h3>' +
            (st.sync === 'loading' ? '<span class="ad-help">' + fa('fa-spinner fa-spin') + ' Leyendo los calendarios…</span>' : '') + '</div>' + body + '</section>' +
            '<p class="ad-help">Booking no indica si una fecha es una reserva o un cierre, así que aparece como «reserva o cierre». Cuando una plataforma solo copia el cierre de otra, se muestra una única vez.</p>';
    }

    // ══ Calendario ══
    function monthHtml(p, first, map) {
        var d0 = date(first), offset = (d0.getUTCDay() + 6) % 7;
        var count = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 0)).getUTCDate();
        var html = '<div><p class="ad-month-name">' + esc(monthName(first)) + '</p><div class="ad-days">';
        WEEK.forEach(function (n) { html += '<span class="ad-dow">' + n + '</span>'; });
        for (var i = 0; i < offset; i++) html += '<span></span>';
        for (var n = 1; n <= count; n++) {
            var d = first.slice(0, 8) + pad(n), s = map[d], past = d < today;
            var picked = d === st.pick || (st.range && d >= st.range.a && d <= st.range.b);
            var price = !s && !past && p.price.base > 0 ? money(PR.nightPrice(p, d)) : '';
            var cls = 'ad-day' + (past ? ' is-past' : '') + (d === today ? ' is-today' : '') +
                (s ? ' is-' + s.src + (s.start === d ? ' is-from' : '') + (addDays(d, 1) === s.end ? ' is-to' : '') : '') +
                (price && (PR.ruleFor(p, d, 'price') || PR.ruleFor(p, d, 'discount')) ? ' is-special' : '') + (picked ? ' is-pick' : '') +
                (st.seg && s && s.start === st.seg.start && s.src === st.seg.src ? ' is-sel' : '');
            html += '<button type="button" class="' + cls + '" data-act="day" data-date="' + d + '" aria-label="' + esc(human(d) + (s ? ', ' + SRC[s.src].label : price ? ', libre, ' + price : '')) + '">' + n +
                (price ? '<small>' + price + '</small>' : '') + '</button>';
        }
        return html + '</div></div>';
    }
    function calendarGrid(p) {
        var month = st.month || today.slice(0, 8) + '01', map = nightMap(p), months = '';
        for (var k = 0; k < 6; k++) months += monthHtml(p, addMonths(month, k), map);
        return '<div class="ad-months">' + months + '</div>';
    }
    function rangeLabel(a, b) {
        var noYear = b.slice(0, 4) === today.slice(0, 4);
        if (a === b) return human(a, noYear);
        return (a.slice(0, 7) === b.slice(0, 7) ? date(a).getUTCDate() + '–' : human(a, true) + ' – ') + human(b, noYear);
    }
    // Las noches elegidas: cuántas están libres, bloqueadas por usted o con reserva, y entre qué precios.
    function selection(p) {
        var a = st.range.a, end = addDays(st.range.b, 1), map = nightMap(p);
        var s = { a: a, end: end, n: diff(a, end), free: 0, blocked: 0, taken: 0, min: Infinity, max: 0 };
        for (var d = a; d < end; d = addDays(d, 1)) {
            var seg = map[d], price = PR.nightPrice(p, d);
            if (!seg) s.free++; else if (seg.src === 'block') s.blocked++; else s.taken++;
            s.min = Math.min(s.min, price);
            s.max = Math.max(s.max, price);
        }
        return s;
    }
    // Lo que se pone desde el calendario se guarda como un periodo con este nombre y esas fechas exactas.
    function customRule(p, a, b) {
        return p.price.rules.filter(function (r) { return r.name === CUSTOM && r.start === a && r.end === b && !r.repeat && !r.days.length; })[0] || null;
    }
    // Abre (o cierra, sin valor) un apartado del panel lateral. Los de las fechas elegidas se
    // editan sobre un borrador que no toca los datos hasta pulsar "Guardar".
    function openSide(p, value) {
        st.side = value || null;
        st.draft = null;
        if (!/^sel-/.test(st.side || '') || !st.range) return;
        var s = selection(p), r = customRule(p, st.range.a, st.range.b);
        st.draft = { price: r && r.price > 0 ? r.price : s.min === s.max && s.max > 0 && !PR.ruleFor(p, s.a, 'discount') ? s.min : '',
            minNights: r ? r.minNights : 0, discount: r ? r.discount : 0 };
    }
    function sideItem(value, title, lines, icon) {
        return '<button type="button" class="ad-side-item" data-act="side" data-value="' + value + '"><span><strong>' + title + '</strong>' +
            lines.filter(Boolean).map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('') + '</span>' + fa(icon || 'fa-chevron-right') + '</button>';
    }
    function sideHead(title) {
        return '<div class="ad-side-head"><button type="button" class="ad-icon-btn" data-act="side" data-value="" aria-label="Volver">' + fa('fa-arrow-left') + '</button><strong>' + title + '</strong></div>';
    }
    function sideDone() { return '<button type="button" class="ad-btn ad-btn-solid" data-act="side" data-value="">' + fa('fa-check') + 'Listo</button>'; }
    // Sin fechas elegidas: lo que vale para todo el calendario.
    function generalPanel(P, p) {
        var price = p.price, c = price.discounts, stay = p.stay, policy = C.find(C.cancellation, p.cancellation);
        if (st.side === 'precio') return sideHead('Precios') + '<section class="ad-card ad-side-fields">' +
            field('Precio base por noche', P + 'price.base', { kind: 'number', unit: '€', help: 'El de las noches que no tienen un precio propio. Con 0 la web muestra «Precio a consultar».' }) +
            field('Limpieza por estancia', P + 'price.cleaningFee', { kind: 'number', unit: '€' }) +
            '<p class="ad-help">Fianza, huéspedes adicionales y simulador: en <button type="button" class="ad-link" data-act="go" data-page="editor" data-tab="precios">Precios</button>.</p>' + sideDone() + '</section>';
        if (st.side === 'descuentos') return sideHead('Descuentos') + discountsHtml(P, c) +
            '<p class="ad-help">Con 0 % no se aplica. Si a una estancia le corresponden varios, se aplica solo el mayor.</p>' + sideDone();
        if (st.side === 'disponibilidad') return sideHead('Disponibilidad') + '<section class="ad-card ad-side-fields">' +
            field('Estancia mínima (noches)', P + 'price.minNights', { kind: 'stepper', min: 1, max: 60 }) +
            field('Estancia máxima (noches)', P + 'stay.maxNights', { kind: 'stepper', max: 365, zero: 'Sin límite' }) +
            field('Antelación mínima para reservar', P + 'stay.notice', { kind: 'selectnum', options: NOTICES }) +
            field('Hasta cuándo se puede reservar', P + 'stay.window', { kind: 'selectnum', options: WINDOWS }) +
            '<p class="ad-help">Margen entre reservas y días de entrada: en <button type="button" class="ad-link" data-act="go" data-page="editor" data-tab="disponibilidad">Disponibilidad</button>.</p>' + sideDone() + '</section>';
        if (st.side === 'cancelacion') return sideHead('Cancelaciones') + policyOptions(P, p) + sideDone();

        var offers = [];
        if (c.weekly > 0) offers.push('Descuento semanal del ' + c.weekly + ' %');
        if (c.monthly > 0) offers.push('Descuento mensual del ' + c.monthly + ' %');
        if (c.earlyPercent > 0) offers.push('Reserva anticipada: ' + c.earlyPercent + ' %');
        if (c.lastPercent > 0) offers.push('Última hora: ' + c.lastPercent + ' %');
        return '<p class="ad-help">Elija días en el calendario para cambiar su precio, bloquearlos o anotar una reserva.</p>' +
            sideItem('precio', 'Precios', [price.base > 0 ? money(price.base) + ' por noche' : 'Precio a consultar', price.cleaningFee > 0 ? 'Limpieza: ' + money(price.cleaningFee) : '']) +
            sideItem('descuentos', 'Descuentos', offers.length ? offers : ['Sin descuentos']) +
            sideItem('disponibilidad', 'Disponibilidad', [stay.maxNights ? 'Estancias de ' + price.minNights + ' a ' + nights(stay.maxNights) : 'Estancia mínima de ' + nights(price.minNights),
                stay.notice ? 'Preaviso mínimo de ' + stay.notice + (stay.notice === 1 ? ' día' : ' días') : 'Se puede reservar para el mismo día']) +
            sideItem('cancelacion', 'Cancelaciones', [policy ? policy.label : 'No se muestra en la ficha']);
    }
    // Con fechas elegidas: disponibilidad, precio y ajustes solo de esas noches.
    function selectionPanel(p) {
        var s = selection(p), r = customRule(p, s.a, st.range.b), draft = st.draft || {};
        var open = s.free > 0 && !s.blocked, closed = s.blocked > 0 && !s.free, full = s.taken === s.n;
        var state = full ? 'Reservado' : closed ? 'Bloqueado' : s.blocked ? 'Bloqueado en parte' : 'Disponible';
        var priceText = s.max > 0 ? (s.min === s.max ? money(s.min) : money(s.min) + ' – ' + money(s.max)) : 'A consultar';
        var which = s.n === 1 ? 'esta noche' : 'las ' + s.n + ' noches elegidas';
        var actions = '<div class="ad-side-actions"><button type="button" class="ad-btn ad-btn-ghost" data-act="side" data-value="">Cancelar</button>' +
            '<button type="button" class="ad-btn ad-btn-solid" data-act="sel-save">Guardar</button></div>';
        var number = function (label, key, unit, help) {
            return '<label class="ad-field"><span class="ad-label">' + label + '</span><span class="ad-unit"><input type="number" inputmode="numeric" step="1" min="0" data-draft="' + key + '" value="' + esc(draft[key]) + '"><span>' + unit + '</span></span>' +
                '<span class="ad-help">' + help + '</span></label>';
        };
        var minNow = PR.minNights(p, s.a), offNow = PR.ruleFor(p, s.a, 'discount');

        return '<div class="ad-side-head"><span class="ad-side-chip">' + esc(rangeLabel(s.a, st.range.b)) + '</span><span class="ad-help">' + nights(s.n) + '</span>' +
            '<button type="button" class="ad-icon-btn" data-act="range-cancel" aria-label="Quitar la selección" title="Quitar la selección">' + fa('fa-xmark') + '</button></div>' +
            (st.pick ? '<p class="ad-help">Pulse otro día para ampliar el tramo.</p>' : '') +
            '<section class="ad-card"><div class="ad-side-row"><div><strong>' + state + '<i class="ad-dot' + (open ? '' : ' is-off') + '"></i></strong>' +
            (s.taken ? '<span class="ad-help">' + (full ? 'Estas noches ya tienen reserva.' : nights(s.taken) + ' con reserva no ' + (s.taken === 1 ? 'cambia.' : 'cambian.')) + '</span>' : '') + '</div>' +
            (full ? '' : '<div class="ad-seg" role="group" aria-label="Disponibilidad">' +
                '<button type="button" class="' + (closed ? 'is-on' : '') + '" aria-pressed="' + closed + '" data-act="sel-block" aria-label="Bloquear estas fechas" title="Bloquear">' + fa('fa-xmark') + '</button>' +
                '<button type="button" class="' + (open ? 'is-on' : '') + '" aria-pressed="' + open + '" data-act="sel-open" aria-label="Dejar disponibles estas fechas" title="Disponible">' + fa('fa-check') + '</button></div>') + '</div></section>' +
            (st.side === 'sel-price'
                ? '<section class="ad-card"><label class="ad-field"><span class="ad-label">Precio por noche</span><span class="ad-unit ad-side-price"><input type="number" inputmode="decimal" step="any" min="0" data-draft="price" value="' + esc(draft.price) + '"><span>€</span></span>' +
                    '<span class="ad-help">Para ' + which + '. Ahora: ' + priceText + '.</span></label>' + actions + '</section>'
                : '<button type="button" class="ad-side-item" data-act="side" data-value="sel-price"><span><span class="ad-label">Precio por noche</span><strong class="ad-side-big">' + priceText + '</strong></span>' + fa('fa-pen') + '</button>') +
            (st.side === 'sel-more'
                ? '<section class="ad-card ad-side-fields"><strong>Ajustes personalizados</strong>' +
                    number('Estancia mínima', 'minNights', 'noches', '0 = la general (' + nights(p.price.minNights) + '). Cuenta para las estancias que empiezan en estas fechas.') +
                    number('Descuento', 'discount', '%', 'Se resta del precio de ' + which + '. 0 = sin descuento.') + actions + '</section>'
                : sideItem('sel-more', 'Ajustes personalizados', ['Estancia mínima: ' + nights(minNow), offNow ? 'Descuento: ' + offNow.discount + ' %' : 'Sin descuento'], 'fa-plus')) +
            (full ? '' : '<button type="button" class="ad-btn" data-act="range-book">' + fa('fa-handshake') + 'Anotar reserva directa</button>') +
            (r ? '<button type="button" class="ad-link" data-act="sel-reset">Quitar el precio y los ajustes propios de estas fechas</button>' : '');
    }
    // Una reserva o un bloqueo pulsado en el calendario.
    function segPanel(p, s) {
        var mine = s.src === 'direct' || s.src === 'block', b = mine ? p.blocked[s.ref] : null;
        return '<div class="ad-side-head"><span class="ad-side-chip">' + esc(rangeLabel(s.start, addDays(s.end, -1))) + '</span><span class="ad-help">' + nights(diff(s.start, s.end)) + '</span>' +
            '<button type="button" class="ad-icon-btn" data-act="range-cancel" aria-label="Cerrar" title="Cerrar">' + fa('fa-xmark') + '</button></div>' +
            '<section class="ad-card ad-side-fields"><strong>' + srcTag(s.src, s.src === 'held' ? 'No disponible en ' + SRC[s.platform].label : SRC[s.src].label) + '</strong>' +
            '<p>' + esc(human(s.start)) + ' → ' + esc(human(s.end)) + (s.label ? '<br>' + esc(s.label) : '') +
            (b && b.type === 'booking' ? '<br>' + money(b.total) + ' · ' + esc((C.find(C.payments, b.paid) || {}).label || '') : '') + '</p>' +
            (mine ? '<div class="ad-side-actions"><button type="button" class="ad-btn" data-act="form-edit" data-ref="' + s.ref + '">' + fa('fa-pen') + 'Editar</button>' +
                '<button type="button" class="ad-btn ad-btn-danger" data-act="row-del" data-ref="' + s.ref + '">' + fa('fa-trash') + (s.src === 'block' ? 'Desbloquear' : 'Eliminar') + '</button></div>'
                : s.src === 'airbnb' && /^https:\/\/www\.airbnb\./.test(s.url || '') ? '<a class="ad-btn" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + fa('fa-arrow-up-right-from-square') + 'Abrir en Airbnb</a>'
                    : '<p class="ad-help">Llega del calendario de la plataforma: se cambia allí.</p>') + '</section>';
    }
    function sidePanel(p) {
        if (st.form) return formCard();
        var s = st.seg && segmentsOf(p).filter(function (x) { return x.start === st.seg.start && x.src === st.seg.src; })[0];
        if (s) return segPanel(p, s);
        if (st.range) return selectionPanel(p);
        return generalPanel('properties.' + st.prop + '.', p);
    }
    function sideClass() { return 'ad-side' + (st.form || st.seg || st.range ? ' is-sel' : ''); }
    function rulesList(P, p) {
        var n = p.price.rules.length;
        return (n ? p.price.rules.map(function (r, i) { return ruleHtml(P, r, i, n); }).join('') : '<p class="ad-empty">Sin precios por fechas: se aplica la tarifa general todo el año.</p>') +
            '<button type="button" class="ad-btn ad-btn-small ad-add" data-act="add" data-list="' + P + 'price.rules" data-new="rule">' + fa('fa-plus') + 'Añadir periodo</button>';
    }
    // Calendario a un lado y, al otro, el panel de lo elegido: como en los paneles de las plataformas.
    function pageCalendario() {
        var p = current(), month = st.month || today.slice(0, 8) + '01';
        return '<div class="ad-head"><div class="ad-head-text"><h2>Calendario</h2><p>Pulse un día, y después otro si quiere un tramo, para cambiar su precio, bloquearlo o anotar una reserva.</p></div></div>' +
            '<div class="ad-cal-layout"><section class="ad-card"><div class="ad-cal-bar">' +
            '<button type="button" class="ad-icon-btn" data-act="nav" data-step="-1" aria-label="Mes anterior"' + (month <= addMonths(today, -12) ? ' disabled' : '') + '>' + fa('fa-chevron-left') + '</button>' +
            '<button type="button" class="ad-btn ad-btn-small" data-act="today">Hoy</button>' +
            '<button type="button" class="ad-icon-btn" data-act="nav" data-step="1" aria-label="Mes siguiente"' + (month >= addMonths(today, 18) ? ' disabled' : '') + '>' + fa('fa-chevron-right') + '</button>' +
            (st.sync === 'loading' ? '<span class="ad-help">' + fa('fa-spinner fa-spin') + ' Leyendo los calendarios…</span>' : '') +
            '<p class="ad-legend">' + CHANNELS.concat(['block', 'held']).map(function (k) { return '<span><i class="ad-key is-' + k + '"></i>' + SRC[k].label + '</span>'; }).join('') + '</p></div>' +
            '<div id="ad-cal">' + calendarGrid(p) + '</div>' +
            '<p class="ad-help" style="margin-top:16px">Los días libres muestran su precio por noche; en dorado, los que tienen un precio o un descuento propio. La ficha pública cierra todas las fechas ocupadas, sea cual sea su origen' +
            (p.stay.prep ? ', más ' + nights(p.stay.prep) + ' de margen alrededor de cada reserva' : '') + '.</p></section>' +
            '<aside id="ad-side" class="' + sideClass() + '" aria-label="Precio y disponibilidad">' + sidePanel(p) + '</aside></div>' +
            card('Periodos y temporadas', rulesList('properties.' + st.prop + '.', p),
                'Todos los precios por fechas, también los que pone desde el calendario. Aquí puede crear temporadas que se repiten cada año o que solo afectan a ciertas noches de la semana. Si dos coinciden en una noche, manda el que esté más arriba.', 'fa-calendar-plus');
    }
    // Repinta el calendario y, salvo que se esté escribiendo en él, el panel lateral.
    function refreshCalendar(keepSide) {
        var el = document.getElementById('ad-cal'), side = document.getElementById('ad-side');
        if (!el || !current()) return;
        el.innerHTML = calendarGrid(current());
        if (side && !keepSide) { side.className = sideClass(); side.innerHTML = sidePanel(current()); }
    }

    // ══ Alojamientos: aquí se elige con cuál se va a trabajar ══
    function pageAlojamientos() {
        var count = st.data.properties.length;
        var cards = st.data.properties.map(function (p, i) {
            var q = quality(p), src = p.image ? thumb(p, p.image) : '';
            var type = C.find(C.types, p.type), place = [type ? type.es : '', p.location.es, p.province].filter(Boolean).join(' · ');
            return '<article class="ad-prop"><div class="ad-prop-media">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '') +
                (p.hidden ? '<span class="ad-tag">' + fa('fa-eye-slash') + 'Oculto</span>' : '<span class="ad-tag is-ok">' + fa('fa-circle-check') + 'Visible</span>') + '</div>' +
                '<div class="ad-prop-body"><h3>' + esc(propName(p)) + '</h3><p>' + esc(place || 'Sin ubicación') + '</p>' +
                '<div class="ad-prop-stats"><div><strong>' + (p.price.base > 0 ? money(PR.lowestPrice(p, today)) : '—') + '</strong><span>desde / noche</span></div>' +
                '<div><strong>' + Math.round(occupancy30(p) / 30 * 100) + ' %</strong><span>ocupación 30 días</span></div>' +
                '<div><strong>' + q.percent + ' %</strong><span>calidad del anuncio</span></div></div>' +
                '<div class="ad-prop-actions"><button type="button" class="ad-btn ad-btn-solid" data-act="go" data-page="panel" data-prop="' + i + '">' + fa('fa-arrow-right') + 'Gestionar</button>' +
                '<a class="ad-icon-btn" style="height:38px;width:38px" target="_blank" rel="noopener" href="propiedad.html?casa=' + encodeURIComponent(p.slug) + '" aria-label="Ver en la web" title="Ver en la web">' + fa('fa-arrow-up-right-from-square') + '</a></div></div></article>';
        }).join('');
        return '<div class="ad-head"><div class="ad-head-text"><h2>' + (count ? 'Elija un alojamiento' : 'Empiece por su primer alojamiento') + '</h2><p>' +
            (count ? 'Al elegirlo verá su resumen, sus reservas, su calendario y todas las secciones de su anuncio.' : 'Todavía no hay ninguno en el panel.') + '</p></div></div>' +
            '<div class="ad-props">' + cards + '<article class="ad-prop is-new"><h3>' + fa('fa-plus') + 'Añadir alojamiento</h3><p class="ad-help">Se crea oculto, para completarlo con calma antes de publicarlo.</p>' +
            '<div class="ad-inline"><label class="ad-field"><span class="ad-label">Nombre</span><input type="text" id="ad-new-prop" placeholder="Casa…"></label>' +
            '<button type="button" class="ad-btn ad-btn-solid" data-act="add-prop">Crear</button></div></article></div>';
    }

    // ══ Editor de un alojamiento ══
    function tabGeneral(P, p) {
        return card('Datos básicos',
            bi('Título', P + 'name', { help: 'Si escribe «Nombre | Subtítulo», lo que va tras la barra se muestra como subtítulo.' }) +
            grid(field('Tipo de alojamiento', P + 'type', { kind: 'select', options: [['', 'Sin indicar']].concat(C.types.map(function (t) { return [t.id, t.es]; })) }),
                field('Provincia', P + 'province', { kind: 'select', options: PROVINCES.map(function (x) { return [x, x]; }) }),
                field('Nº de registro turístico', P + 'license')) +
            bi('Zona o municipio', P + 'location'), '', 'fa-house') +
            card('Capacidad', grid(field('Huéspedes', P + 'guests', { kind: 'stepper', min: 1, max: 40 }), field('Dormitorios', P + 'bedrooms', { kind: 'stepper', max: 30 }),
                field('Baños', P + 'bathrooms', { kind: 'stepper', max: 30 }), field('Aseos', P + 'toilets', { kind: 'stepper', max: 30 })), '', 'fa-user-group') +
            card('Distribución de camas', rows(P + 'rooms', 'room', 'Añadir estancia', function (R) {
                return '<div class="ad-beds">' + field('Estancia', R + '.kind', { kind: 'select', options: C.roomKinds.map(function (k) { return [k.id, k.es]; }) }) +
                    C.beds.map(function (b) { return field(b.label, R + '.beds.' + b.id, { kind: 'stepper', max: 9 }); }).join('') + '</div>';
            }, { empty: 'Sin indicar. Añada cada dormitorio con sus camas.' }),
                'La ficha muestra qué camas hay en cada estancia. Al añadir dormitorios, el número de dormitorios de arriba se ajusta solo.', 'fa-bed') +
            card('Textos',
                bi('Resumen corto (ficha del listado)', P + 'summary', { kind: 'area', rows: 3, count: true }) +
                bi('Descripción completa', P + 'description', { kind: 'area', rows: 8, count: true }), '', 'fa-pen') +
            card('Publicación',
                field('Ocultar este alojamiento en la web', P + 'hidden', { kind: 'check', help: 'Sigue guardado en el panel, pero los visitantes no lo ven.' }) +
                grid(field('Dirección web', P + 'slug', { help: 'propiedad.html?casa=<strong>' + esc(p.slug) + '</strong>. Si la cambia, los enlaces antiguos dejan de funcionar.' })) +
                '<button type="button" class="ad-btn ad-btn-danger" data-act="del-prop">' + fa('fa-trash') + 'Eliminar este alojamiento</button>', '', 'fa-eye');
    }

    // Precios
    function ruleSummary(r) {
        if (!ruleOk(r)) return '<span class="ad-error">Fechas no válidas</span>';
        return esc(human(r.start, r.repeat)) + ' → ' + esc(human(r.end, r.repeat)) + (r.repeat ? ' · cada año' : '');
    }
    function ruleHtml(P, r, i, n) {
        var R = P + 'price.rules.' + i, open = st.rule === i;
        var tags = (r.price > 0 ? '<span class="ad-tag is-price">' + money(r.price) + ' / noche</span>' : r.discount > 0 ? '' : '<span class="ad-tag">Precio base</span>') +
            (r.discount > 0 ? '<span class="ad-tag is-price">−' + r.discount + ' %</span>' : '') +
            (r.minNights > 0 ? '<span class="ad-tag">mín. ' + nights(r.minNights) + '</span>' : '') +
            (r.days.length ? '<span class="ad-tag">' + r.days.map(function (d) { return WEEK[d]; }).join(' ') + '</span>' : '');
        var head = '<div class="ad-rule-head"><div class="ad-rule-main"><strong>' + esc(r.name || 'Sin nombre') + '</strong><span>' + ruleSummary(r) + '</span></div>' +
            '<div class="ad-rule-tags">' + tags + '</div><div class="ad-row-tools">' +
            '<button type="button" class="ad-icon-btn" data-act="rule" data-i="' + i + '" aria-label="' + (open ? 'Cerrar' : 'Editar') + '" aria-expanded="' + open + '">' + fa(open ? 'fa-chevron-up' : 'fa-pen') + '</button>' +
            '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + P + 'price.rules" data-i="' + i + '" data-d="-1" aria-label="Subir prioridad"' + (i === 0 ? ' disabled' : '') + '>' + fa('fa-arrow-up') + '</button>' +
            '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + P + 'price.rules" data-i="' + i + '" data-d="1" aria-label="Bajar prioridad"' + (i === n - 1 ? ' disabled' : '') + '>' + fa('fa-arrow-down') + '</button>' +
            '<button type="button" class="ad-icon-btn is-danger" data-act="del" data-list="' + P + 'price.rules" data-i="' + i + '" aria-label="Eliminar">' + fa('fa-trash') + '</button></div></div>';
        if (!open) return '<div class="ad-rule">' + head + '</div>';
        return '<div class="ad-rule is-open">' + head + '<div class="ad-rule-form">' +
            grid(field('Tipo de periodo', R + '.name', { kind: 'select', options: C.ruleNames.map(function (x) { return [x, x]; }) }),
                field('Desde', R + '.start', { kind: 'date' }), field('Hasta (incluido)', R + '.end', { kind: 'date' })) +
            grid(field('Precio por noche', R + '.price', { kind: 'number', unit: '€', help: '0 = se mantiene el precio que ya tengan esas noches.' }),
                field('Descuento', R + '.discount', { kind: 'number', unit: '%', max: 90, help: 'Se resta del precio de esas noches. 0 = sin descuento.' }),
                field('Estancia mínima', R + '.minNights', { kind: 'number', unit: 'noches', help: '0 = la estancia mínima general.' })) +
            seg('Noches a las que se aplica', R + '.days', WEEK.map(function (d, k) { return [k, d]; }), { num: true, help: r.days.length ? 'Solo las noches marcadas.' : 'Sin marcar ninguna = todas las noches.' }) +
            field('Repetir todos los años', R + '.repeat', { kind: 'check', help: 'Se aplica cada año entre el mismo día y mes.' }) +
            '<button type="button" class="ad-btn ad-btn-small" data-act="rule" data-i="' + i + '">' + fa('fa-check') + 'Listo</button></div></div>';
    }
    function offer(icon, title, text, on, fields) {
        return '<div class="ad-offer' + (on ? ' is-on' : '') + '"><h4>' + fa(icon) + title + '</h4><p>' + text + '</p>' + fields + '</div>';
    }
    // Los cuatro descuentos por estancia. Se editan en Precios y en el panel lateral del Calendario.
    function discountsHtml(P, c) {
        var percent = function (key) { return field('Descuento', P + 'price.discounts.' + key, { kind: 'number', unit: '%', max: 90 }); };
        return '<div class="ad-offers">' +
            offer('fa-calendar-week', 'Semanal', 'Estancias de 7 noches o más.', c.weekly > 0, percent('weekly')) +
            offer('fa-calendar', 'Mensual', 'Estancias de 28 noches o más.', c.monthly > 0, percent('monthly')) +
            offer('fa-hourglass-start', 'Reserva anticipada', 'Para quien reserva con mucha antelación.', c.earlyPercent > 0, percent('earlyPercent') +
                field('Antelación', P + 'price.discounts.earlyDays', { kind: 'selectnum', options: [30, 60, 90, 120, 180].map(function (d) { return [d, d + ' días o más']; }) })) +
            offer('fa-bolt', 'Última hora', 'Para llenar huecos cercanos.', c.lastPercent > 0, percent('lastPercent') +
                field('Llegadas en', P + 'price.discounts.lastDays', { kind: 'selectnum', options: [1, 2, 3, 5, 7, 14].map(function (d) { return [d, 'los próximos ' + d + (d === 1 ? ' día' : ' días')]; }) })) +
            '</div>';
    }
    function policyOptions(P, p) {
        return '<div class="ad-options">' + [{ id: '', label: 'No mostrar', es: 'La ficha no incluye el apartado de cancelación.' }].concat(C.cancellation).map(function (c) {
            var on = (p.cancellation || '') === c.id;
            return '<button type="button" class="ad-option' + (on ? ' is-on' : '') + '" aria-pressed="' + on + '" data-act="set" data-path="' + P + 'cancellation" data-value="' + c.id + '" data-keep="1"><strong>' + esc(c.label) + '</strong><span>' + esc(c.es) + '</span></button>';
        }).join('') + '</div>';
    }
    // Lo que vería un huésped en la ficha, con las tarifas tal como están ahora en el panel.
    function quoteHtml(p) {
        var s = st.sim;
        if (!isDate(s.start)) return '<div class="ad-quote"><p>Elija un día de entrada.</p></div>';
        if (!(p.price.base > 0)) return '<div class="ad-quote"><p>' + fa('fa-circle-info') + 'Sin precio base, la web muestra «Precio a consultar».</p></div>';
        var q = PR.quote(p, s.start, addDays(s.start, s.nights), s.guests, today), notes = [], min = PR.minNights(p, s.start), max = PR.maxNights(p);
        if (s.nights < min) notes.push('Por debajo de la estancia mínima para esa fecha (' + nights(min) + ').');
        if (max && s.nights > max) notes.push('Supera la estancia máxima (' + nights(max) + ').');
        if (!PR.canArrive(p, s.start, today)) notes.push('Ese día de entrada no se puede reservar: revise antelación, calendario abierto y días de entrada.');
        var line = function (label, value, cls) { return '<div' + (cls ? ' class="' + cls + '"' : '') + '><dt>' + label + '</dt><dd>' + value + '</dd></div>'; };
        return '<div class="ad-quote"><dl>' + line(nights(q.nights), money(q.stay)) +
            (q.extra ? line('Huéspedes adicionales (' + q.extraGuests + ')', money(q.extra)) : '') +
            (q.discount ? line(OFFERS[q.discount.type] + ' (−' + q.discount.percent + ' %)', '−' + money(q.discount.amount), 'is-off') : '') +
            (q.cleaning ? line('Limpieza', money(q.cleaning)) : '') + line('Total para el huésped', money(q.total), 'is-total') + '</dl>' +
            notes.map(function (n) { return '<p>' + fa('fa-triangle-exclamation') + n + '</p>'; }).join('') + '</div>';
    }
    function simulator(p) {
        var s = st.sim, stepper = function (label, key, min, max) {
            var b = function (d, text) { return '<button type="button" data-act="sim-step" data-key="' + key + '" data-d="' + d + '" data-min="' + min + '" data-max="' + max + '" aria-label="' + (d < 0 ? 'Menos ' : 'Más ') + label.toLowerCase() + '"' + ((d < 0 ? s[key] <= min : s[key] >= max) ? ' disabled' : '') + '>' + text + '</button>'; };
            return '<div class="ad-field"><span class="ad-label">' + label + '</span><div class="ad-stepper">' + b(-1, '−') + '<output>' + s[key] + '</output>' + b(1, '+') + '</div></div>';
        };
        return '<div class="ad-sim"><div>' + grid('<label class="ad-field"><span class="ad-label">Día de entrada</span><input type="date" data-sim="start" value="' + esc(s.start) + '"></label>') +
            grid(stepper('Noches', 'nights', 1, 90), stepper('Huéspedes', 'guests', 1, p.guests)) + '</div><div id="ad-sim-out">' + quoteHtml(p) + '</div></div>';
    }
    function tabPrecios(P, p) {
        var c = p.price.discounts;
        if (!st.sim) st.sim = { start: addDays(today, 30), nights: Math.max(7, p.price.minNights), guests: 2 };
        st.sim.guests = Math.max(1, Math.min(st.sim.guests, p.guests));
        return card('Tarifa general',
            grid(field('Precio base por noche', P + 'price.base', { kind: 'number', unit: '€', help: 'Con 0 la web muestra «Precio a consultar».' }),
                field('Limpieza por estancia', P + 'price.cleaningFee', { kind: 'number', unit: '€' }),
                field('Fianza', P + 'price.deposit', { kind: 'number', unit: '€', help: 'Solo informativa: se muestra en la ficha.' })) +
            field('Precio orientativo', P + 'price.approx', { kind: 'check', help: 'La web dice «Precio total desde» y avisa de que puede variar según la temporada.' }), '', 'fa-tag') +
            card('Huéspedes adicionales',
                grid(field('Huéspedes incluidos en el precio', P + 'price.extraGuestAfter', { kind: 'stepper', max: p.guests, zero: 'Todos', help: 'A partir de este número se cobra el suplemento.' }),
                    field('Suplemento por huésped y noche', P + 'price.extraGuestFee', { kind: 'number', unit: '€' })),
                'Útil si el precio base es para un grupo pequeño y quiere cobrar algo más por cada persona extra.', 'fa-user-plus') +
            card('Descuentos', discountsHtml(P, c), 'Con 0 % el descuento no se aplica. Si a una estancia le corresponden varios, se aplica solo el mayor. Se calculan sobre las noches, no sobre la limpieza.', 'fa-percent') +
            '<p class="ad-help" style="margin-bottom:16px">Los precios, descuentos y estancias mínimas de unas fechas concretas (' + p.price.rules.length + ') se ponen en el ' +
            '<button type="button" class="ad-link" data-act="go" data-page="calendario">Calendario</button>, eligiendo los días.</p>' +
            card('Simulador de precio', '<div id="ad-sim">' + simulator(p) + '</div>', 'Lo que vería un huésped en la ficha con las tarifas de esta pestaña, también antes de guardar.', 'fa-calculator');
    }
    function tabDisponibilidad(P, p) {
        return card('Duración de la estancia',
            grid(field('Estancia mínima (noches)', P + 'price.minNights', { kind: 'stepper', min: 1, max: 60, help: 'Los precios por fechas pueden fijar otra para su periodo.' }),
                field('Estancia máxima (noches)', P + 'stay.maxNights', { kind: 'stepper', max: 365, zero: 'Sin límite' })), '', 'fa-moon') +
            card('Antelación y calendario abierto',
                grid(field('Antelación mínima para reservar', P + 'stay.notice', { kind: 'selectnum', options: NOTICES }),
                    field('Hasta cuándo se puede reservar', P + 'stay.window', { kind: 'selectnum', options: WINDOWS })),
                'Evita reservas de última hora que no pueda preparar y fechas demasiado lejanas.', 'fa-hourglass-half') +
            card('Margen entre reservas',
                seg('Noches cerradas antes y después de cada reserva', P + 'stay.prep', [[0, 'Ninguna'], [1, '1 noche'], [2, '2 noches']], { num: true, keep: true,
                    help: 'Tiempo para limpiar y preparar la casa. Se aplica a las reservas de las plataformas y a las directas, no a sus bloqueos.' }), '', 'fa-broom') +
            card('Días de entrada',
                seg('Días en los que puede empezar una estancia', P + 'stay.checkinDays', ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(function (d, k) { return [k, d]; }),
                    { num: true, help: p.stay.checkinDays.length ? 'Solo se puede entrar los días marcados.' : 'Sin marcar ninguno = se puede entrar cualquier día.' }), '', 'fa-right-to-bracket') +
            '<p class="ad-help">Las fechas ocupadas no se editan aquí: las reservas directas y los bloqueos se anotan en <strong>Calendario</strong> o en <strong>Reservas</strong>, y las de las plataformas llegan solas desde <strong>iCal y enlaces</strong>.</p>';
    }
    function tabServicios(P, p) {
        var featured = p.featured.map(function (id) { return C.services[id]; }).filter(Boolean);
        var top = card('Destacados (' + featured.length + ' de 6)',
            featured.length ? '<div class="ad-chips">' + featured.map(function (s) {
                return '<span class="ad-chip is-gold">' + fa(s.icon) + esc(s.es) + '<button type="button" data-act="toggle" data-path="' + P + 'featured" data-value="' + s.id + '" aria-label="Quitar ' + esc(s.es) + ' de destacados">' + fa('fa-xmark') + '</button></span>';
            }).join('') + '</div>' : '<p class="ad-empty">Ninguno todavía.</p>',
            'Se muestran arriba en la ficha, junto a huéspedes, dormitorios y baños. Marque un servicio y pulse su estrella para destacarlo.', 'fa-star');
        var groups = C.categories.map(function (c) {
            var count = c.items.filter(function (s) { return p.services.indexOf(s.id) >= 0; }).length;
            return card(esc(c.es) + (count ? ' <span class="ad-count">' + count + '</span>' : ''), '<div class="ad-svcs">' + c.items.map(function (s) {
                var on = p.services.indexOf(s.id) >= 0, star = p.featured.indexOf(s.id) >= 0;
                return '<div class="ad-svc' + (on ? ' is-on' : '') + '">' +
                    '<button type="button" class="ad-svc-main" aria-pressed="' + on + '" data-act="toggle" data-path="' + P + 'services" data-value="' + s.id + '">' + fa(s.icon) + '<span>' + esc(s.es) + '</span></button>' +
                    (on ? '<button type="button" class="ad-svc-star' + (star ? ' is-on' : '') + '" aria-pressed="' + star + '" data-act="toggle" data-path="' + P + 'featured" data-value="' + s.id + '" data-max="6" aria-label="Destacar ' + esc(s.es) + '" title="Destacar">' + fa('fa-star') + '</button>' : '') +
                    '</div>';
            }).join('') + '</div>', '', c.icon);
        }).join('');
        return top + groups + card('Otros servicios', rows(P + 'extraServices', 'extra', 'Añadir otro servicio', function (R) {
            return grid(field('Español', R + '.es'), field('English', R + '.en'));
        }, { empty: 'Nada añadido.' }), 'Solo para lo que no esté en las listas de arriba.', 'fa-circle-plus');
    }
    function tabFotos(P, p) {
        var n = p.gallery.length;
        var photos = n ? '<div class="ad-photos">' + p.gallery.map(function (src, i) {
            var shown = thumb(p, src);
            return '<figure class="ad-photo' + (i === 0 ? ' is-cover' : '') + '">' + (i === 0 ? '<span class="ad-photo-tag">Portada</span>' : '') +
                '<img src="' + esc(shown) + '" alt="" loading="lazy" title="' + esc(src) + '"><figcaption>' +
                '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + P + 'gallery" data-i="' + i + '" data-d="-1" aria-label="Mover antes"' + (i === 0 ? ' disabled' : '') + '>' + fa('fa-arrow-left') + '</button>' +
                '<button type="button" class="ad-icon-btn" data-act="cover" data-i="' + i + '" aria-label="Poner como portada" title="Poner como portada"' + (i === 0 ? ' disabled' : '') + '>' + fa('fa-star') + '</button>' +
                '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + P + 'gallery" data-i="' + i + '" data-d="1" aria-label="Mover después"' + (i === n - 1 ? ' disabled' : '') + '>' + fa('fa-arrow-right') + '</button>' +
                '<button type="button" class="ad-icon-btn is-danger" data-act="del" data-list="' + P + 'gallery" data-i="' + i + '" aria-label="Quitar de la galería" title="Quitar de la galería">' + fa('fa-trash') + '</button>' +
                '</figcaption></figure>';
        }).join('') + '</div>' : '<p class="ad-empty">Este alojamiento todavía no tiene fotos.</p>';
        return card('Galería (' + n + ')', photos, 'Las fotos se ven en este orden y la primera es la portada. Quitar una foto de la galería no borra el archivo.', 'fa-images') +
            card('Añadir una foto', '<div class="ad-inline">' +
                '<label class="ad-field"><span class="ad-label">Ruta del archivo o dirección https</span><input type="text" id="ad-new-photo" placeholder="fotos/' + esc(p.id) + '/46.jpg"></label>' +
                '<button type="button" class="ad-btn" data-act="add-photo">' + fa('fa-plus') + 'Añadir</button></div>',
                'El panel no sube archivos: la foto debe estar antes en la web, dentro de la carpeta <code>fotos/' + esc(p.id) + '/</code>.', 'fa-upload') +
            card('Opciones',
                bi('Descripción de la foto de portada (accesibilidad y buscadores)', P + 'imageAlt') +
                field('Usar miniaturas', P + 'thumbs', { kind: 'check', help: 'Actívelo solo si cada foto tiene una copia pequeña con el mismo nombre en la subcarpeta <code>thumbs</code>.' }), '', 'fa-sliders');
    }
    function tabNormas(P, p) {
        return card('Horarios', grid(field('Hora de entrada (a partir de)', P + 'checkIn', { kind: 'select', options: times() }),
            field('Hora de salida (antes de)', P + 'checkOut', { kind: 'select', options: times() })), '', 'fa-clock') +
            card('Normas de la casa', '<div class="ad-grid is-wide">' + C.house.map(function (h) {
                return seg(h.label, P + 'house.' + h.id, h.options.map(function (o) { return [o.id, o.label]; }));
            }).join('') + '</div>' +
                bi('Detalles sobre mascotas (opcional)', P + 'pets', { kind: 'area', rows: 2, help: 'Por ejemplo, número máximo o suplementos.' }),
                'Lo que marque aparece en la ficha; lo que deje sin marcar no se menciona.', 'fa-clipboard-list') +
            card('Política de cancelación', policyOptions(P, p), 'El texto se publica tal cual en la ficha, en español e inglés.', 'fa-calendar-xmark') +
            card('Ubicación',
                bi('Texto de la ubicación', P + 'locationText', { kind: 'area', rows: 3 }) +
                grid(field('Coordenadas o búsqueda para el mapa', P + 'mapQuery', { placeholder: '36.711145,-4.731890', help: 'Latitud y longitud separadas por una coma, o un nombre de lugar.' }),
                    field('Acercamiento del mapa', P + 'mapZoom', { kind: 'selectnum', options: ZOOMS })), '', 'fa-location-dot');
    }
    function reviewDate(R, r) {
        var text = (r.date && r.date.es) || '', m = 0, y = (/\d{4}/.exec(text) || [now.getFullYear()])[0];
        MONTHS.forEach(function (x, i) { if (text.toLowerCase().indexOf(x[0]) === 0) m = i; });
        var years = [];
        for (var k = now.getFullYear(); k >= 2015; k--) years.push(k);
        if (years.indexOf(+y) < 0) years.push(+y);
        var select = function (part, label, options, value) {
            return '<label class="ad-field"><span class="ad-label">' + label + '</span><select data-date="' + R + '" data-part="' + part + '">' + options.map(function (o) {
                return '<option value="' + o[0] + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
            }).join('') + '</select></label>';
        };
        return select('m', 'Mes', MONTHS.map(function (x, i) { return [i, x[0].charAt(0).toUpperCase() + x[0].slice(1)]; }), m) +
            select('y', 'Año', years.map(function (x) { return [x, x]; }), y);
    }
    function tabOpiniones(P) {
        return card('Opiniones de huéspedes', rows(P + 'reviews', 'review', 'Añadir opinión', function (R, r) {
            var scores = [];
            for (var k = r.max; k >= 1; k--) scores.push([k, r.max === 5 ? k + (k === 1 ? ' estrella' : ' estrellas') : k + ' sobre 10']);
            return grid(field('Plataforma', R + '.source', { kind: 'select', options: Object.keys(REVIEWS).map(function (k) { return [k, REVIEWS[k]]; }) }),
                field('Puntuación', R + '.rating', { kind: 'selectnum', options: scores }), field('Nombre del huésped', R + '.name')) +
                grid(reviewDate(R, r)) +
                field('Comentario', R + '.text', { kind: 'area', rows: 3, help: 'Vacío = valoración sin comentario.' });
        }, { move: true, tall: true }), 'Copie solo opiniones reales de sus anuncios. La escala (5 estrellas o sobre 10) se ajusta sola según la plataforma.', 'fa-star');
    }
    function tabSync(P, p) {
        return card('Calendarios de las plataformas (iCal)', '<div class="ad-chips">' + syncChips(p) + '</div>' +
            grid(field('Enlace iCal de Airbnb', P + 'ical.airbnb', { placeholder: 'https://…' }), field('Enlace iCal de Vrbo', P + 'ical.vrbo', { placeholder: 'https://…' }),
                field('Enlace iCal de Booking', P + 'ical.booking', { placeholder: 'https://…' })),
            'Pegue el enlace de exportación de calendario de cada anuncio para que sus reservas se marquen solas como ocupadas. Son enlaces privados: no se muestran en la web. El estado se actualiza al guardar.', 'fa-rotate') +
            card('Enlaces a los anuncios',
                grid(field('Airbnb', P + 'links.airbnb', { placeholder: 'https://…' }), field('Vrbo', P + 'links.vrbo', { placeholder: 'https://…' }), field('Booking.com', P + 'links.booking', { placeholder: 'https://…' })),
                'Enlace público a cada anuncio (debe empezar por https://). Si se deja vacío, el botón no aparece en la ficha.', 'fa-arrow-up-right-from-square');
    }
    function pageEditor() {
        var p = current(), P = 'properties.' + st.prop + '.', tab = tabOf(st.tab);
        var body = { general: tabGeneral, precios: tabPrecios, disponibilidad: tabDisponibilidad, servicios: tabServicios, fotos: tabFotos, normas: tabNormas, opiniones: tabOpiniones, sync: tabSync }[st.tab](P, p);
        return '<div class="ad-head"><div class="ad-head-text"><h2>' + tab[1] + '</h2><p>' + tab[3] + '</p></div></div>' + body;
    }

    // ══ Ajustes ══
    function pageAjustes() {
        var light = document.documentElement.getAttribute('data-theme') === 'light';
        return '<div class="ad-head"><div class="ad-head-text"><h2>Ajustes generales</h2><p>Lo que es común a todos los alojamientos y las opciones del panel.</p></div></div>' +
            card('Contacto',
                grid(field('Teléfono (como se muestra)', 'contact.phone', { placeholder: '+34 600 000 000' }), field('Teléfono para llamar', 'contact.tel', { placeholder: '+34600000000', help: 'Sin espacios.' }),
                    field('WhatsApp', 'contact.whatsapp', { placeholder: '34600000000', help: 'Solo números, con el prefijo del país.' }), field('Email', 'contact.email')),
                'Datos de contacto que aparecen en todas las fichas de alojamiento.', 'fa-phone') +
            card('Calendario público', field('Modo demostración', 'demo', { kind: 'check', help: 'Solo afecta a los alojamientos que aún no tienen ningún calendario conectado. Activado: la web muestra fechas de ejemplo y un aviso de «página en preparación». Desactivado: dice que la disponibilidad está por confirmar. Con algún calendario conectado, la web usa siempre las fechas reales y sus bloqueos.' }), '', 'fa-calendar-days') +
            card('Apariencia del panel', '<div class="ad-seg" role="group" aria-label="Tema">' +
                '<button type="button" class="' + (light ? '' : 'is-on') + '" aria-pressed="' + !light + '" data-act="theme" data-value="dark">' + fa('fa-moon') + ' Oscuro</button>' +
                '<button type="button" class="' + (light ? 'is-on' : '') + '" aria-pressed="' + light + '" data-act="theme" data-value="light">' + fa('fa-sun') + ' Claro</button></div>',
                'Se recuerda en este navegador. No cambia la web pública.', 'fa-palette') +
            card('Copia de seguridad', '<div class="ad-chips"><button type="button" class="ad-btn" data-act="export">' + fa('fa-download') + 'Descargar copia</button>' +
                '<button type="button" class="ad-btn" data-act="import">' + fa('fa-upload') + 'Restaurar una copia</button></div><input type="file" id="ad-import" accept="application/json,.json" hidden>',
                'La copia incluye todos los alojamientos, reservas directas y ajustes. Al restaurar una, nada cambia en la web hasta que pulse Guardar.', 'fa-box-archive');
    }

    // ══ Estructura ══
    function upcoming(p) {
        var end = addDays(today, 30);
        return segmentsOf(p).filter(function (s) { return isChannel(s.src) && s.start >= today && s.start <= end; }).length;
    }
    // Sin alojamiento elegido el menú solo ofrece elegir uno; con él, aparecen sus secciones.
    function renderNav() {
        var el = root.querySelector('.ad-nav');
        if (!el) return;
        var p = current();
        var link = function (on, attrs, icon, label, badge) {
            return '<button type="button" class="ad-nav-item' + (on ? ' is-active' : '') + '"' + (on ? ' aria-current="page"' : '') + ' data-act="go"' + attrs + '>' + fa(icon) + '<span>' + label + '</span>' + (badge ? '<b title="Llegadas en los próximos 30 días">' + badge + '</b>' : '') + '</button>';
        };
        var item = function (page, badge) { return link(st.page === page, ' data-page="' + page + '"', PAGES[page][1], PAGES[page][0], badge); };
        var sections = p
            ? '<button type="button" class="ad-current" data-act="go" data-page="alojamientos" title="Cambiar de alojamiento">' +
                '<span class="ad-current-img">' + (p.image ? '<img src="' + esc(thumb(p, p.image)) + '" alt="">' : fa('fa-house')) + '</span>' +
                '<span class="ad-current-text"><strong>' + esc(propName(p)) + '</strong><span>Cambiar</span></span>' + fa('fa-right-left') + '</button>' +
                '<p class="ad-nav-title">Gestión</p>' + item('panel') + item('reservas', upcoming(p)) + item('calendario') +
                '<p class="ad-nav-title">Anuncio</p>' + TABS.map(function (t) { return link(st.page === 'editor' && st.tab === t[0], ' data-page="editor" data-tab="' + t[0] + '"', t[2], t[1]); }).join('')
            : item('alojamientos') + '<p class="ad-nav-hint">Elija un alojamiento para ver su resumen, sus reservas, su calendario y su anuncio.</p>';
        el.innerHTML = '<div class="ad-brand"><img src="LOGO.png" alt=""><div><strong>Vellum Costa</strong><span>Panel de alojamientos</span></div></div>' +
            sections + '<p class="ad-nav-title">General</p>' + item('ajustes') +
            '<div class="ad-nav-foot">' + (p
                ? '<a class="ad-nav-item" href="propiedad.html?casa=' + encodeURIComponent(p.slug) + '" target="_blank" rel="noopener">' + fa('fa-arrow-up-right-from-square') + '<span>Ver su ficha en la web</span></a>'
                : '<a class="ad-nav-item" href="propiedades.html" target="_blank" rel="noopener">' + fa('fa-arrow-up-right-from-square') + '<span>Ver la web</span></a>') +
            '<button type="button" class="ad-nav-item" data-act="logout">' + fa('fa-right-from-bracket') + '<span>Cerrar sesión</span></button></div>';
    }
    function renderTop() {
        var el = root.querySelector('.ad-top');
        if (!el) return;
        var light = document.documentElement.getAttribute('data-theme') === 'light';
        var title = (st.page === 'editor' ? tabOf(st.tab)[1] : PAGES[st.page][0]) + (current() && st.page !== 'ajustes' ? '<small>' + esc(propName(current())) + '</small>' : '');
        var state = st.saving ? ['is-saving', 'fa-spinner fa-spin', 'Guardando…'] : st.failed ? ['is-failed', 'fa-circle-exclamation', 'No se ha guardado']
            : st.dirty ? ['is-dirty', 'fa-circle', 'Cambios sin guardar'] : ['is-saved', 'fa-circle-check', 'Todo guardado'];
        el.innerHTML = '<button type="button" class="ad-icon-btn ad-menu-btn" data-act="menu" aria-label="Abrir el menú">' + fa('fa-bars') + '</button><h1>' + title + '</h1>' +
            '<span class="ad-state ' + state[0] + '" role="status">' + fa(state[1]) + '<span>' + state[2] + '</span></span>' +
            (st.dirty && !st.fresh && !st.saving ? '<button type="button" class="ad-icon-btn" data-act="discard" aria-label="Descartar los cambios sin guardar" title="Descartar cambios">' + fa('fa-rotate-left') + '</button>' : '') +
            '<button type="button" class="ad-btn ad-btn-solid" data-act="save"' + (st.dirty && !st.saving ? '' : ' disabled') + '>' + fa(st.saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk') + '<span>' + (st.failed ? 'Reintentar' : 'Guardar') + '</span></button>' +
            '<button type="button" class="ad-icon-btn" data-act="theme" aria-label="' + (light ? 'Cambiar al tema oscuro' : 'Cambiar al tema claro') + '" title="' + (light ? 'Tema oscuro' : 'Tema claro') + '">' + fa(light ? 'fa-moon' : 'fa-sun') + '</button>';
    }
    function renderMain() {
        var el = root.querySelector('.ad-main');
        if (!el) return;
        var pages = { panel: pagePanel, reservas: pageReservas, calendario: pageCalendario, alojamientos: pageAlojamientos, editor: pageEditor, ajustes: pageAjustes };
        el.innerHTML = (st.fresh ? '<p class="ad-banner">' + fa('fa-circle-info') + '<span><strong>Primera vez:</strong> estos datos vienen del archivo de la web. Pulse <strong>Guardar</strong> para que, a partir de ahora, la web muestre lo que edite aquí.</span></p>' : '') + pages[st.page]();
    }
    function render() {
        // Resumen, reservas, calendario y anuncio solo existen dentro de un alojamiento.
        if (!current()) { st.prop = null; if (st.page !== 'ajustes') st.page = 'alojamientos'; }
        else if (st.page === 'alojamientos') st.prop = null;
        if (!tabOf(st.tab)) st.tab = 'general';
        root.innerHTML = '<div class="ad-app' + (st.menu ? ' is-menu' : '') + '"><aside class="ad-nav" aria-label="Menú principal"></aside>' +
            '<button type="button" class="ad-backdrop" data-act="menu" aria-label="Cerrar el menú"></button>' +
            '<div class="ad-body"><header class="ad-top"></header><main class="ad-main"></main></div></div>';
        renderNav();
        renderTop();
        renderMain();
    }
    // La dirección recuerda dónde se está: #/alojamientos, #/ajustes, #/casa-1/resumen, #/casa-1/precios…
    function hash() {
        var p = current();
        if (!p || st.page === 'alojamientos' || st.page === 'ajustes') return '#/' + (st.page === 'ajustes' ? 'ajustes' : 'alojamientos');
        return '#/' + encodeURIComponent(p.id) + '/' + (st.page === 'editor' ? st.tab : st.page === 'panel' ? 'resumen' : st.page);
    }
    function remember(replace) { try { history[replace ? 'replaceState' : 'pushState'](null, '', hash()); } catch (e) { } }
    function route() {
        var parts = location.hash.replace(/^#\/?/, '').split('/'), id = parts[0] || '';
        try { id = decodeURIComponent(id); } catch (e) { }
        // Ajustes no pertenece a ningún alojamiento: se conserva el que estuviera elegido.
        if (id === 'ajustes') { st.page = 'ajustes'; return; }
        st.page = 'alojamientos';
        st.prop = indexOfId(id);
        if (st.prop == null) return;
        if (parts[1] === 'reservas' || parts[1] === 'calendario') st.page = parts[1];
        else if (tabOf(parts[1])) { st.page = 'editor'; st.tab = parts[1]; }
        else st.page = 'panel';
    }
    function go(page, o) {
        o = o || {};
        var before = st.prop;
        st.page = page;
        if (o.prop != null) st.prop = o.prop;
        if (o.tab) st.tab = o.tab;
        if (page === 'alojamientos') st.prop = null;
        if (st.prop !== before) st.sim = null;
        st.pick = st.range = st.seg = st.form = st.rule = st.month = st.side = st.draft = null;
        st.menu = false;
        render();
        remember();
        window.scrollTo(0, 0);
    }
    window.addEventListener('popstate', function () { if (st.data) { route(); st.pick = st.range = st.seg = st.form = st.rule = st.month = st.sim = st.side = st.draft = null; st.menu = false; render(); } });
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('vc-admin-theme', theme); } catch (e) { }
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'light' ? '#f2f4f8' : '#0e1117');
        if (st.data) { renderTop(); if (st.page === 'ajustes') renderMain(); }
    }
    // Tras repintar, devuelve el foco al botón equivalente al que se pulsó.
    function refocus(b) {
        var sel = ['act', 'path', 'value', 'list', 'i', 'd', 'date', 'key', 'page', 'tab', 'ref', 'type', 'step'].map(function (k) {
            return b.hasAttribute('data-' + k) ? '[data-' + k + '="' + b.getAttribute('data-' + k) + '"]' : '';
        }).join('');
        var el = sel && root.querySelector('.ad-main ' + sel);
        if (el && !el.disabled) el.focus({ preventScroll: true });
    }

    // ── Información al pasar por los gráficos (también con el teclado) ──
    var tipBox = null;
    function showTip(el, x, y) {
        var data;
        try { data = JSON.parse(el.getAttribute('data-tip')); } catch (e) { return; }
        if (!tipBox) { tipBox = document.body.appendChild(document.createElement('div')); tipBox.className = 'ad-tip'; tipBox.setAttribute('role', 'tooltip'); }
        tipBox.textContent = '';
        var add = function (cls, text) { var n = tipBox.appendChild(document.createElement('div')); n.className = cls; n.textContent = text; return n; };
        add('ad-tip-title', data.t);
        data.r.forEach(function (r) {
            var row = add('ad-tip-row', '');
            row.appendChild(document.createElement('i')).className = 'is-' + r[0];
            row.appendChild(document.createElement('strong')).textContent = r[2];
            row.appendChild(document.createElement('span')).textContent = r[1];
        });
        if (data.f) add('ad-tip-foot', data.f);
        tipBox.hidden = false;
        var w = tipBox.offsetWidth || 180, h = tipBox.offsetHeight || 80;
        tipBox.style.left = Math.max(8, Math.min(x + 14, window.innerWidth - w - 8)) + 'px';
        tipBox.style.top = Math.max(8, y + 16 + h > window.innerHeight ? y - h - 12 : y + 16) + 'px';
    }
    function hideTip() { if (tipBox) tipBox.hidden = true; }
    root.addEventListener('pointermove', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); else hideTip(); });
    root.addEventListener('pointerleave', hideTip);
    root.addEventListener('focusin', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) { var r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top + 8); } });
    root.addEventListener('focusout', hideTip);

    // ── Eventos: campos ──
    function syncBedrooms(p) {
        var n = p.rooms.filter(function (r) { return r.kind === 'bedroom'; }).length;
        if (n) p.bedrooms = n;
    }
    root.addEventListener('input', function (e) {
        var el = e.target;
        if (!st.data) return;
        // Reserva directa o bloqueo en edición: no toca los datos hasta pulsar "Anotar".
        if (el.hasAttribute('data-form')) {
            var name = el.getAttribute('data-form');
            if (!st.form) return;
            st.form.d[name] = name === 'guests' || name === 'total' ? Number(el.value) || 0 : el.value;
            var info = document.getElementById('ad-form-info');
            if (info) info.innerHTML = formInfo();
            return;
        }
        // Precio y ajustes de las fechas elegidas en el calendario: borrador hasta pulsar "Guardar".
        if (el.hasAttribute('data-draft')) {
            if (st.draft) st.draft[el.getAttribute('data-draft')] = Number(el.value) || 0;
            return;
        }
        if (el.hasAttribute('data-sim')) {
            st.sim.start = el.value;
            var out = document.getElementById('ad-sim-out');
            if (out) out.innerHTML = quoteHtml(current());
            return;
        }
        // Mes y año de una opinión: se guarda el texto de la fecha en los dos idiomas.
        if (el.hasAttribute('data-date')) {
            var R = el.getAttribute('data-date');
            var part = function (n) { return +root.querySelector('[data-date="' + R + '"][data-part="' + n + '"]').value; };
            set(R + '.date', monthLabel(part('m'), part('y')));
            return touch();
        }
        var path = el.getAttribute('data-path');
        if (!path) return;
        var kind = el.getAttribute('data-kind'), v = el.value;
        if (kind === 'check') v = el.checked;
        else if (kind === 'number' || kind === 'selectnum') v = Number(v) || 0;
        set(path, v);
        touch();

        var counter = root.querySelector('[data-count="' + path + '"]');
        if (counter) counter.textContent = String(v).length + ' caracteres';
        if (/\.blocked\.\d+\.paid$/.test(path)) {
            el.className = 'ad-pill-select is-' + v;
        } else if (/\.reviews\.\d+\.source$/.test(path)) {
            // La escala de puntuación depende de la plataforma.
            var review = get(path.replace(/\.source$/, ''));
            if (review.max !== SCALE[v]) { review.rating = review.max = SCALE[v]; renderMain(); }
        } else if (/\.price\.rules\.\d+\.name$/.test(path) && v === 'Fines de semana') {
            var rule = get(path.replace(/\.name$/, ''));
            if (!rule.days.length) { rule.days = [4, 5]; renderMain(); }
        } else if (/\.rooms\.\d+\.kind$/.test(path)) {
            syncBedrooms(current());
        } else if (/\.hidden$/.test(path) || /\.price\.rules\.\d+\.repeat$/.test(path)) {
            renderMain();
        } else if (st.page === 'calendario' && /\.price\.|\.stay\./.test(path)) {
            // Los precios del calendario siguen a lo que se escribe, sin repintar el campo en uso.
            var offerBox = el.closest('.ad-offer');
            if (offerBox && /Percent$|weekly$|monthly$/.test(path)) offerBox.classList.toggle('is-on', v > 0);
            refreshCalendar(true);
        } else if (st.page === 'editor' && st.tab === 'precios' && /\.price\./.test(path)) {
            // El simulador y el aspecto de los descuentos siguen a lo que se escribe.
            var box = el.closest('.ad-offer');
            if (box && /Percent$|weekly$|monthly$/.test(path)) box.classList.toggle('is-on', v > 0);
            var sim = document.getElementById('ad-sim-out');
            if (sim) sim.innerHTML = quoteHtml(current());
        }
    });
    root.addEventListener('change', function (e) {
        // Restaurar una copia de seguridad descargada desde el panel.
        if (e.target.id !== 'ad-import' || !e.target.files || !e.target.files[0]) return;
        var reader = new FileReader(), file = e.target.files[0];
        // Así se puede volver a elegir el mismo archivo si la primera vez falla.
        e.target.value = '';
        reader.onload = function () {
            var data;
            try { data = JSON.parse(reader.result); } catch (err) { data = null; }
            if (!data || !Array.isArray(data.properties)) return toast('Ese archivo no es una copia de seguridad del panel.', true);
            st.data = data;
            normalize(st.data);
            // Los alojamientos de la copia pueden ser otros: se vuelve a elegir.
            st.prop = st.form = st.rule = st.sim = st.pick = st.range = st.seg = null;
            st.page = 'alojamientos';
            touch();
            render();
            remember(true);
            toast('Copia cargada. Revísela y pulse Guardar para aplicarla.');
        };
        reader.readAsText(file);
    });
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && st.data) { e.preventDefault(); save(); }
        if (e.key === 'Escape') hideTip();
        if (e.key === 'Enter' && e.target.hasAttribute && e.target.hasAttribute('data-draft')) {
            var saveDraft = root.querySelector('[data-act="sel-save"]');
            if (saveDraft) { e.preventDefault(); saveDraft.click(); }
        }
    });

    // ── Eventos: botones ──
    function focusForm() {
        var el = document.getElementById('ad-form');
        if (!el) return;
        el.scrollIntoView({ block: 'nearest' });
        var firstField = el.querySelector('input, select');
        if (firstField) firstField.focus({ preventScroll: true });
    }
    root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || b.disabled) return;
        var act = b.getAttribute('data-act');
        if (act === 'theme') return setTheme(b.getAttribute('data-value') || (document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
        if (!st.data) return;
        var p = current();
        var path = b.getAttribute('data-path'), value = b.getAttribute('data-value');
        var listPath = b.getAttribute('data-list') || '', items = listPath ? get(listPath) : null;
        var i = +b.getAttribute('data-i'), ref = +b.getAttribute('data-ref');
        var isRules = /\.price\.rules$/.test(listPath), isRooms = /\.rooms$/.test(listPath), isGallery = /\.gallery$/.test(listPath);
        // La portada es siempre la primera foto. Solo se recalcula al tocar la galería, no otras listas.
        var syncCover = function () { p.image = p.gallery[0] || ''; };

        // Navegación y acciones generales
        if (act === 'go') return go(b.getAttribute('data-page'), { prop: b.hasAttribute('data-prop') ? +b.getAttribute('data-prop') : null, tab: b.getAttribute('data-tab') });
        if (act === 'menu') { st.menu = !st.menu; return root.querySelector('.ad-app').classList.toggle('is-menu', st.menu); }
        if (act === 'save') return save();
        if (act === 'discard') { if (confirm('Se perderán todos los cambios que no haya guardado. ¿Continuar?')) { st.dirty = false; load(); } return; }
        if (act === 'logout') {
            if (st.dirty && !confirm('Hay cambios sin guardar que se perderán. ¿Salir de todos modos?')) return;
            st.dirty = false;
            return api('POST', { action: 'logout' }).then(function () { st.data = null; renderLogin(load); });
        }
        if (act === 'sync') { st.sync = 'loading'; renderMain(); return loadEvents(); }
        if (act === 'ui') { st[b.getAttribute('data-key')] = value; renderMain(); return refocus(b); }
        if (act === 'table') { st.table[b.getAttribute('data-key')] = !st.table[b.getAttribute('data-key')]; renderMain(); return refocus(b); }
        if (act === 'rule') { st.rule = st.rule === i ? null : i; renderMain(); return refocus(b); }
        if (act === 'export') {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(st.data, null, 2)], { type: 'application/json' }));
            a.download = 'vellum-alojamientos-' + today + '.json';
            a.click();
            return setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        }
        if (act === 'import') return document.getElementById('ad-import').click();
        if (act === 'add-prop') {
            var box = document.getElementById('ad-new-prop'), name = box.value.trim();
            if (!name) { box.classList.add('is-bad'); return box.focus(); }
            st.data.properties.push(emptyProperty(name));
            touch();
            go('editor', { prop: st.data.properties.length - 1, tab: 'general' });
            return toast('Alojamiento creado y oculto: complételo y desmarque «Ocultar» cuando esté listo.');
        }
        // Todo lo que sigue actúa sobre el alojamiento elegido.
        if (!p) return;

        // Calendario
        if (act === 'nav') { st.month = addMonths(st.month || today.slice(0, 8) + '01', +b.getAttribute('data-step')); renderMain(); return refocus(b); }
        if (act === 'today') { st.month = null; return renderMain(); }
        if (act === 'range-cancel') { st.pick = st.range = st.seg = st.side = st.draft = null; return refreshCalendar(); }
        if (act === 'day') {
            // Un día libre queda elegido al pulsarlo; el siguiente que se pulse cierra el tramo.
            // Un día ocupado, si no se está eligiendo un tramo, enseña su reserva o bloqueo.
            var d = b.getAttribute('data-date'), seg = nightMap(p)[d];
            if (st.pick) { st.range = { a: d < st.pick ? d : st.pick, b: d < st.pick ? st.pick : d }; st.pick = null; }
            else if (seg) { st.range = null; st.seg = { start: seg.start, src: seg.src }; }
            else { if (d < today) return; st.seg = null; st.range = { a: d, b: d }; st.pick = d; }
            st.side = st.draft = st.form = null;
            refreshCalendar();
            return refocus(b);
        }
        if (act === 'side') {
            openSide(p, value);
            refreshCalendar();
            var first = root.querySelector('#ad-side input[data-draft], #ad-side input[data-path]');
            if (first && st.side) { first.focus({ preventScroll: true }); if (first.select) first.select(); }
            return;
        }
        if (act === 'sel-block' || act === 'sel-open') {
            // Bloquear o abrir las noches elegidas. Los bloqueos que ya hubiera se recortan a lo
            // que quede fuera del tramo; las reservas no se tocan.
            var from = st.range.a, to = addDays(st.range.b, 1), kept = [];
            p.blocked.forEach(function (x) {
                if (x.type !== 'block' || x.end <= from || x.start >= to) return kept.push(x);
                if (x.start < from) kept.push(copy(x, { end: from }));
                if (x.end > to) kept.push(copy(x, { start: to }));
            });
            if (act === 'sel-block') kept.push({ type: 'block', start: from, end: to, note: '' });
            p.blocked = kept.sort(function (x, y) { return x.start < y.start ? -1 : x.start > y.start ? 1 : 0; });
            st.form = st.side = st.draft = null;
            touch();
            renderMain();
            return refocus(b);
        }
        if (act === 'sel-save') {
            var a = st.range.a, z = st.range.b, draft = st.draft || {}, own = customRule(p, a, z);
            if (st.side === 'sel-price' && !(draft.price > 0)) return toast('Escriba un precio por noche mayor que 0.', true);
            if (own) p.price.rules.splice(p.price.rules.indexOf(own), 1);
            else own = { name: CUSTOM, start: a, end: z, price: 0, discount: 0, minNights: 0, days: [], repeat: false };
            if (st.side === 'sel-price') own.price = draft.price;
            else {
                own.minNights = Math.max(0, Math.min(365, Math.round(draft.minNights) || 0));
                own.discount = Math.max(0, Math.min(90, Math.round(draft.discount) || 0));
            }
            // Los periodos de calendario anteriores que quedan tapados por completo ya no hacen nada: se quitan.
            p.price.rules = p.price.rules.filter(function (r) {
                return !(r.name === CUSTOM && !r.repeat && !r.days.length && r.start >= a && r.end <= z &&
                    (!(r.price > 0) || own.price > 0) && (!(r.minNights > 0) || own.minNights > 0) && (!(r.discount > 0) || own.discount > 0));
            });
            // Va arriba del todo para que mande sobre las temporadas que hubiera en esas fechas.
            if (own.price > 0 || own.minNights > 0 || own.discount > 0) p.price.rules.unshift(own);
            st.side = st.draft = st.rule = null;
            touch();
            return renderMain();
        }
        if (act === 'sel-reset') {
            var mine = customRule(p, st.range.a, st.range.b);
            if (mine) p.price.rules.splice(p.price.rules.indexOf(mine), 1);
            st.side = st.draft = st.rule = null;
            touch();
            return renderMain();
        }
        if (act === 'range-book') { openForm(st.prop, 'booking', null, st.range); renderMain(); return focusForm(); }

        // Reservas directas y bloqueos
        if (act === 'form-new') { openForm(st.prop, b.getAttribute('data-type'), null); renderMain(); return focusForm(); }
        if (act === 'form-edit') { if (!p.blocked[ref]) return; openForm(st.prop, null, ref); renderMain(); return focusForm(); }
        if (act === 'form-cancel') { st.form = null; return renderMain(); }
        if (act === 'form-quote') {
            var f = st.form, fp = st.data.properties[f.pi];
            if (!isDate(f.d.start) || !isDate(f.d.end) || f.d.end <= f.d.start) return toast('Indique antes las fechas de entrada y salida.', true);
            if (!(fp.price.base > 0)) return toast('Este alojamiento no tiene precio base: escriba el importe a mano.', true);
            f.d.total = PR.quote(fp, f.d.start, f.d.end, f.d.guests, today).total;
            root.querySelector('[data-form="total"]').value = f.d.total;
            return;
        }
        if (act === 'form-save') {
            var form = st.form, target = st.data.properties[form.pi], fd = form.d;
            if (!isDate(fd.start) || !isDate(fd.end) || fd.end <= fd.start) return toast('La salida debe ser posterior a la entrada.', true);
            var entry = form.type === 'booking'
                ? { type: 'booking', start: fd.start, end: fd.end, guest: fd.guest || '', phone: fd.phone || '', guests: fd.guests || 0, total: fd.total || 0, paid: fd.paid || 'pending', channel: fd.channel || 'other', note: fd.note || '' }
                : { type: 'block', start: fd.start, end: fd.end, note: fd.note || '' };
            if (form.ref == null) target.blocked.push(entry); else target.blocked[form.ref] = entry;
            target.blocked.sort(function (x, y) { return x.start < y.start ? -1 : x.start > y.start ? 1 : 0; });
            st.form = null;
            touch();
            renderMain();
            return toast((entry.type === 'booking' ? 'Reserva anotada' : 'Fechas bloqueadas') + '. Pulse Guardar para aplicarlo en la web.');
        }
        if (act === 'row-del') {
            var gone = p.blocked[ref];
            if (!gone || !confirm(gone.type === 'booking' ? '¿Eliminar la reserva de «' + (gone.guest || 'sin nombre') + '»? Las fechas volverán a quedar libres.' : '¿Quitar este bloqueo? Las fechas volverán a quedar libres.')) return;
            p.blocked.splice(ref, 1);
            st.seg = st.form = null;
            touch();
            return renderMain();
        }

        // Anuncio
        if (act === 'del-prop') {
            if (!confirm('¿Eliminar «' + propName(p) + '» con todos sus datos y reservas directas? Se aplicará al pulsar Guardar.')) return;
            st.data.properties.splice(st.prop, 1);
            st.prop = null;
            touch();
            return go('alojamientos');
        }
        if (act === 'sim-step') {
            var k = b.getAttribute('data-key');
            st.sim[k] = Math.min(+b.getAttribute('data-max'), Math.max(+b.getAttribute('data-min'), st.sim[k] + (+b.getAttribute('data-d'))));
            document.getElementById('ad-sim').innerHTML = simulator(p);
            return refocus(b);
        }

        // Editor: cambios en los datos
        if (act === 'set') {
            // Opción única: pulsar la que ya está activa la desmarca (salvo data-keep).
            var chosen = b.hasAttribute('data-num') ? +value : value;
            set(path, get(path) === chosen && !b.hasAttribute('data-keep') ? '' : chosen);
        } else if (act === 'toggle') {
            var arr = get(path), one = b.hasAttribute('data-num') ? +value : value, at = arr.indexOf(one);
            if (at >= 0) arr.splice(at, 1);
            else if (b.hasAttribute('data-max') && arr.length >= +b.getAttribute('data-max')) return toast('Como máximo ' + b.getAttribute('data-max') + ' destacados. Quite uno para añadir otro.', true);
            else arr.push(one);
            if (b.hasAttribute('data-num')) arr.sort();
            // Un servicio desmarcado deja de estar destacado.
            if (/\.services$/.test(path) && at >= 0 && p.featured.indexOf(one) >= 0) p.featured.splice(p.featured.indexOf(one), 1);
        } else if (act === 'step') {
            set(path, Math.min(+b.getAttribute('data-max'), Math.max(+b.getAttribute('data-min'), (Number(get(path)) || 0) + (+b.getAttribute('data-d')))));
        } else if (act === 'add') {
            items.push(NEW[b.getAttribute('data-new')](p));
            if (isRules) st.rule = items.length - 1;
            if (isRooms) syncBedrooms(p);
        } else if (act === 'del') {
            items.splice(i, 1);
            if (isRules) st.rule = null;
            if (isRooms) syncBedrooms(p);
            if (isGallery) syncCover();
        } else if (act === 'move') {
            var j = i + (+b.getAttribute('data-d'));
            if (j < 0 || j >= items.length) return;
            items.splice(j, 0, items.splice(i, 1)[0]);
            if (isRules) st.rule = null;
            if (isGallery) syncCover();
        } else if (act === 'cover') {
            p.gallery.unshift(p.gallery.splice(i, 1)[0]);
            syncCover();
        } else if (act === 'add-photo') {
            var input = document.getElementById('ad-new-photo'), src = input.value.trim();
            if (!/^https:\/\/\S+$/i.test(src) && !/^[^:<>"'\\]+\.(jpe?g|png|webp|avif)$/i.test(src)) {
                input.classList.add('is-bad');
                return toast('Escriba la ruta de una imagen (jpg, png, webp o avif) o una dirección https.', true);
            }
            if (p.gallery.indexOf(src) >= 0) return toast('Esa foto ya está en la galería.', true);
            p.gallery.push(src);
            syncCover();
        } else return;
        touch();
        renderMain();
        refocus(b);
    });

    load();
})();
