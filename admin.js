// Panel privado de alojamientos (/admin). Lee y guarda los datos mediante /api/admin.
// Las listas de opciones (servicios, tipos, normas, cancelación) están en catalogo.js.
(function () {
    var root = document.getElementById('admin');
    var C = window.VELLUM_CATALOG;
    if (!root || !C) return;

    // view: índice de la propiedad abierta o 'settings'. pick: primer día elegido al bloquear fechas.
    // rule: índice del precio por fechas que se está editando.
    var st = { data: null, view: 0, tab: 'info', dirty: false, fresh: false, saving: false, failed: false, month: null, pick: null, rule: null, platform: {} };

    var DAY = 86400000;
    var now = new Date();
    var today = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
    var SOURCES = { airbnb: 'Airbnb', vrbo: 'Vrbo', booking: 'Booking.com' };
    var SCALE = { airbnb: 5, vrbo: 10, booking: 10 };
    var TABS = [['info', 'General', 'fa-circle-info'], ['precios', 'Precios y calendario', 'fa-calendar-days'], ['servicios', 'Servicios', 'fa-bell-concierge'],
        ['fotos', 'Fotos', 'fa-images'], ['normas', 'Normas y ubicación', 'fa-clipboard-list'], ['opiniones', 'Opiniones', 'fa-star'], ['sync', 'iCal y enlaces', 'fa-rotate']];
    var WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    var MONTHS = [['enero', 'January'], ['febrero', 'February'], ['marzo', 'March'], ['abril', 'April'], ['mayo', 'May'], ['junio', 'June'],
        ['julio', 'July'], ['agosto', 'August'], ['septiembre', 'September'], ['octubre', 'October'], ['noviembre', 'November'], ['diciembre', 'December']];
    var PROVINCES = ['Málaga', 'Cádiz', 'Granada', 'Almería', 'Córdoba', 'Sevilla', 'Huelva', 'Jaén', 'A Coruña', 'Álava', 'Albacete', 'Alicante', 'Asturias', 'Ávila',
        'Badajoz', 'Barcelona', 'Bizkaia', 'Burgos', 'Cáceres', 'Cantabria', 'Castellón', 'Ceuta', 'Ciudad Real', 'Cuenca', 'Gipuzkoa', 'Girona', 'Guadalajara', 'Huesca',
        'Illes Balears', 'La Rioja', 'Las Palmas', 'León', 'Lleida', 'Lugo', 'Madrid', 'Melilla', 'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Pontevedra', 'Salamanca',
        'Santa Cruz de Tenerife', 'Segovia', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Zamora', 'Zaragoza'];
    var ZOOMS = [[11, 'Comarca (muy lejos)'], [12, 'Municipio y alrededores'], [13, 'Municipio'], [14, 'Zona'], [15, 'Barrio'], [16, 'Calles cercanas'], [17, 'Calle (muy cerca)']];
    var ERRORS = {
        wrong_password: 'Contraseña incorrecta.',
        too_many_attempts: 'Demasiados intentos. Espere 15 minutos y vuelva a probar.',
        invalid_data: 'Los datos no tienen el formato esperado.',
        invalid_id: 'Hay un alojamiento con un identificador no válido.',
        duplicate_id: 'Hay dos alojamientos con el mismo identificador.',
        duplicate_slug: 'Hay dos alojamientos con la misma dirección web. Cambie una de ellas en la pestaña General.',
        too_large: 'Los datos ocupan demasiado. Reduzca textos u opiniones.',
        store_error: 'No se ha podido conectar con el almacén de datos. Inténtelo de nuevo en unos minutos.',
        network: 'No hay conexión con el servidor. Compruebe su conexión e inténtelo de nuevo.'
    };

    function iso(d) { return d.toISOString().slice(0, 10); }
    function date(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])); }
    function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ''); }
    function addDays(s, n) { return iso(new Date(date(s).getTime() + n * DAY)); }
    function addMonths(s, n) { var d = date(s); return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))); }
    function diff(a, b) { return Math.round((date(b) - date(a)) / DAY); }
    function human(s, noYear) { return date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: noYear ? undefined : 'numeric', timeZone: 'UTC' }); }
    function monthName(s) { var m = date(s).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }); return m.charAt(0).toUpperCase() + m.slice(1); }
    function money(n) { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); }
    function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function fa(name) { return '<i class="fa-solid ' + esc(name) + '" aria-hidden="true"></i>'; }
    function slugify(s) {
        return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    }
    function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, st.data); }
    function set(path, value) {
        var keys = path.split('.'), last = keys.pop();
        var target = keys.reduce(function (o, k) { if (o[k] == null) o[k] = {}; return o[k]; }, st.data);
        target[last] = value;
    }
    function current() { return st.view === 'settings' ? null : st.data.properties[st.view]; }

    // ── Precios (misma lógica que la web pública, propiedades.js) ──
    function ruleFor(p, d, key) {
        var rules = p.price.rules, dow = (date(d).getUTCDay() + 6) % 7, md = d.slice(5);
        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            if (!ruleOk(r) || !(r[key] > 0) || (r.days.length && r.days.indexOf(dow) < 0)) continue;
            var a = r.start.slice(5), b = r.end.slice(5);
            if (r.repeat ? (a <= b ? md >= a && md <= b : md >= a || md <= b) : d >= r.start && d <= r.end) return r;
        }
        return null;
    }
    function nightPrice(p, d) { var r = ruleFor(p, d, 'price'); return r ? r.price : p.price.base; }
    function ruleOk(r) { return isDate(r.start) && isDate(r.end) && r.end >= r.start; }

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
            summary: { es: '', en: '' }, guests: 2, bedrooms: 1, bathrooms: 1, toilets: 0,
            description: { es: '', en: '' }, services: [], featured: [], extraServices: [],
            locationText: { es: '', en: '' }, mapQuery: '', mapZoom: 14, checkIn: '15:00', checkOut: '10:00',
            house: { pets: '', smoking: '', parties: '', children: '', quiet: '' }, cancellation: '',
            pets: { es: '', en: '' },
            price: { base: 0, rules: [], seasons: [], cleaningFee: 0, minNights: 1, approx: false },
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
            return p;
        });
        return converted;
    }
    function touch() {
        st.dirty = true;
        st.failed = false;
        renderTop();
        renderSide();
    }
    window.addEventListener('beforeunload', function (e) {
        if (st.dirty && st.data) { e.preventDefault(); e.returnValue = ''; }
    });

    // ── Inicio de sesión ──
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
            '<input type="password" name="password" autocomplete="current-password" aria-label="Contraseña" placeholder="Contraseña" required>' +
            '<button type="submit" class="ad-btn ad-btn-solid">Entrar</button>' +
            '<p class="ad-error" role="alert" hidden></p></form>';
        var form = root.querySelector('form'), password = form.querySelector('input'), error = form.querySelector('.ad-error'), button = form.querySelector('button');
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
            if (!st.data.properties.length) st.view = 'settings';
            render();
        });
    }
    // Avisa de lo que el servidor descartaría en silencio.
    function problem() {
        for (var i = 0; i < st.data.properties.length; i++) {
            var p = st.data.properties[i];
            for (var j = 0; j < p.price.rules.length; j++) {
                if (!ruleOk(p.price.rules[j])) {
                    st.view = i; st.tab = 'precios'; st.rule = j;
                    return 'Revise las fechas del precio «' + (p.price.rules[j].name || 'sin nombre') + '»: la fecha final no puede ser anterior a la inicial.';
                }
            }
        }
        return '';
    }
    function save() {
        if (st.saving) return;
        var issue = problem();
        if (issue) { render(); return toast(issue, true); }
        st.saving = true;
        st.failed = false;
        renderTop();
        api('POST', { action: 'save', data: st.data }).then(function (res) {
            st.saving = false;
            if (res.status === 401) return renderLogin(function () { render(); save(); });
            if (res.status !== 200) { st.failed = true; renderTop(); return toast(message(res), true); }
            st.data = res.data;
            normalize(st.data);
            st.dirty = st.fresh = false;
            st.platform = {};
            st.rule = null;
            if (st.view !== 'settings' && !st.data.properties[st.view]) st.view = st.data.properties.length ? 0 : 'settings';
            render();
            toast('Guardado. Los cambios se verán en la web en un minuto aproximadamente.');
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
            return '<div class="ad-field"><span class="ad-label">' + label + '</span><div class="ad-stepper">' + btn(-1, '−', 'Menos') + '<output>' + esc(v) + '</output>' + btn(1, '+', 'Más') + '</div>' + help + '</div>';
        }
        var control;
        if (kind === 'area') {
            control = '<textarea rows="' + (o.rows || 3) + '"' + attrs + '>' + esc(v) + '</textarea>';
        } else if (kind === 'select' || kind === 'selectnum') {
            var options = o.options.slice();
            // Un valor guardado que no está en la lista no se pierde: se añade como opción.
            if (v !== '' && !options.some(function (op) { return String(op[0]) === String(v); })) options.push([v, v]);
            control = '<select' + attrs + '>' + options.map(function (op) {
                return '<option value="' + esc(op[0]) + '"' + (String(op[0]) === String(v) ? ' selected' : '') + '>' + esc(op[1]) + '</option>';
            }).join('') + '</select>';
        } else if (kind === 'number') {
            control = '<input type="number" inputmode="decimal" min="' + (o.min || 0) + '"' + attrs + ' value="' + esc(v) + '">';
            if (o.unit) control = '<span class="ad-unit">' + control + '<span>' + o.unit + '</span></span>';
        } else {
            control = '<input type="' + (kind === 'date' ? 'date' : 'text') + '"' + attrs + ' value="' + esc(v) + '">';
        }
        return '<label class="ad-field"><span class="ad-label">' + label + '</span>' + control + help + '</label>';
    }
    function bi(label, path, o) {
        return '<div class="ad-bi">' + field(label + ' · Español', path + '.es', o) + field(label + ' · English', path + '.en', o) + '</div>';
    }
    // Botones de opción única; pulsar la opción activa la desmarca.
    function seg(label, path, options) {
        var v = get(path) || '';
        return '<div class="ad-field"><span class="ad-label">' + label + '</span><div class="ad-seg" role="group" aria-label="' + esc(label) + '">' + options.map(function (op) {
            return '<button type="button" class="' + (op[0] === v ? 'is-on' : '') + '" aria-pressed="' + (op[0] === v) + '" data-act="set" data-path="' + path + '" data-value="' + esc(op[0]) + '">' + esc(op[1]) + '</button>';
        }).join('') + '</div></div>';
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
        rule: function (p) { return { name: C.ruleNames[0], start: today, end: addDays(today, 6), price: p.price.base, minNights: 0, days: [], repeat: false }; },
        extra: function () { return { es: '', en: '' }; },
        review: function () { return { source: 'airbnb', name: '', date: monthLabel(now.getMonth(), now.getFullYear()), rating: 5, max: 5, text: '' }; }
    };
    function monthLabel(m, y) { return { es: MONTHS[m][0] + ' de ' + y, en: MONTHS[m][1] + ' ' + y }; }
    function times() {
        var out = [['', 'Sin indicar']];
        for (var h = 6; h < 24; h++) { out.push([pad(h) + ':00', pad(h) + ':00']); out.push([pad(h) + ':30', pad(h) + ':30']); }
        return out;
    }

    // ── Información ──
    function tabInfo(P, p) {
        return card('Datos básicos',
            bi('Título', P + 'name', { help: 'Si escribe «Nombre | Subtítulo», lo que va tras la barra se muestra como subtítulo.' }) +
            grid(field('Tipo de alojamiento', P + 'type', { kind: 'select', options: [['', 'Sin indicar']].concat(C.types.map(function (t) { return [t.id, t.es]; })) }),
                field('Provincia', P + 'province', { kind: 'select', options: PROVINCES.map(function (x) { return [x, x]; }) }),
                field('Nº de registro turístico', P + 'license')) +
            bi('Zona o municipio', P + 'location'), '', 'fa-house') +
            card('Capacidad', grid(field('Huéspedes', P + 'guests', { kind: 'stepper', min: 1, max: 40 }), field('Dormitorios', P + 'bedrooms', { kind: 'stepper', max: 30 }),
                field('Baños', P + 'bathrooms', { kind: 'stepper', max: 30 }), field('Aseos', P + 'toilets', { kind: 'stepper', max: 30 })), '', 'fa-user-group') +
            card('Textos',
                bi('Resumen corto (ficha del listado)', P + 'summary', { kind: 'area', rows: 3 }) +
                bi('Descripción completa', P + 'description', { kind: 'area', rows: 8 }), '', 'fa-pen') +
            card('Publicación',
                field('Ocultar este alojamiento en la web', P + 'hidden', { kind: 'check', help: 'Sigue guardado en el panel, pero los visitantes no lo ven.' }) +
                grid(field('Dirección web', P + 'slug', { help: 'propiedad.html?casa=<strong>' + esc(p.slug) + '</strong>. Si la cambia, los enlaces antiguos dejan de funcionar.' })), '', 'fa-eye');
    }

    // ── Precios y calendario ──
    function ruleSummary(r) {
        if (!ruleOk(r)) return '<span class="ad-error">Fechas no válidas</span>';
        return esc(human(r.start, r.repeat)) + ' → ' + esc(human(r.end, r.repeat)) + (r.repeat ? ' · cada año' : '');
    }
    function ruleHtml(P, r, i, n) {
        var R = P + 'price.rules.' + i, open = st.rule === i;
        var tags = (r.price > 0 ? '<span class="ad-tag is-price">' + money(r.price) + ' / noche</span>' : '<span class="ad-tag">Precio base</span>') +
            (r.minNights > 0 ? '<span class="ad-tag">mín. ' + r.minNights + (r.minNights === 1 ? ' noche' : ' noches') + '</span>' : '') +
            (r.days.length ? '<span class="ad-tag">' + r.days.map(function (d) { return WEEK[d]; }).join(' ') + '</span>' : '');
        var head = '<div class="ad-rule-head"><div class="ad-rule-main"><strong>' + esc(r.name || 'Sin nombre') + '</strong><span>' + ruleSummary(r) + '</span></div>' +
            '<div class="ad-rule-tags">' + tags + '</div><div class="ad-row-tools">' +
            '<button type="button" class="ad-icon-btn" data-act="rule" data-i="' + i + '" aria-label="' + (open ? 'Cerrar' : 'Editar') + '" aria-expanded="' + open + '">' + fa(open ? 'fa-chevron-up' : 'fa-pen') + '</button>' +
            '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + P + 'price.rules" data-i="' + i + '" data-d="-1" aria-label="Subir prioridad"' + (i === 0 ? ' disabled' : '') + '>' + fa('fa-arrow-up') + '</button>' +
            '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + P + 'price.rules" data-i="' + i + '" data-d="1" aria-label="Bajar prioridad"' + (i === n - 1 ? ' disabled' : '') + '>' + fa('fa-arrow-down') + '</button>' +
            '<button type="button" class="ad-icon-btn is-danger" data-act="del" data-list="' + P + 'price.rules" data-i="' + i + '" aria-label="Eliminar">' + fa('fa-trash') + '</button></div></div>';
        if (!open) return '<div class="ad-rule">' + head + '</div>';
        var days = '<div class="ad-field"><span class="ad-label">Noches a las que se aplica</span><div class="ad-seg" role="group" aria-label="Noches de la semana">' + WEEK.map(function (d, k) {
            var on = r.days.indexOf(k) >= 0;
            return '<button type="button" class="' + (on ? 'is-on' : '') + '" aria-pressed="' + on + '" data-act="toggle" data-path="' + R + '.days" data-value="' + k + '" data-num="1">' + d + '</button>';
        }).join('') + '</div><span class="ad-help">' + (r.days.length ? 'Solo las noches marcadas.' : 'Sin marcar ninguna = todas las noches.') + '</span></div>';
        return '<div class="ad-rule is-open">' + head + '<div class="ad-rule-form">' +
            grid(field('Tipo de periodo', R + '.name', { kind: 'select', options: C.ruleNames.map(function (x) { return [x, x]; }) }),
                field('Desde', R + '.start', { kind: 'date' }), field('Hasta (incluido)', R + '.end', { kind: 'date' })) +
            grid(field('Precio por noche', R + '.price', { kind: 'number', unit: '€', help: '0 = se mantiene el precio base.' }),
                field('Estancia mínima', R + '.minNights', { kind: 'number', unit: 'noches', help: '0 = la estancia mínima general.' })) +
            days + field('Repetir todos los años', R + '.repeat', { kind: 'check', help: 'Se aplica cada año entre el mismo día y mes.' }) +
            '<button type="button" class="ad-btn ad-btn-small" data-act="rule" data-i="' + i + '">' + fa('fa-check') + 'Listo</button></div></div>';
    }
    function daySet(ranges) {
        var days = {};
        (ranges || []).forEach(function (r) { for (var d = r.start; d < r.end; d = addDays(d, 1)) days[d] = true; });
        return days;
    }
    function monthHtml(p, first, manual, platform) {
        var d0 = date(first), offset = (d0.getUTCDay() + 6) % 7;
        var count = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 0)).getUTCDate();
        var html = '<div><p class="ad-month-name">' + esc(monthName(first)) + '</p><div class="ad-days">';
        WEEK.forEach(function (n) { html += '<span class="ad-dow">' + n + '</span>'; });
        for (var i = 0; i < offset; i++) html += '<span></span>';
        for (var n = 1; n <= count; n++) {
            var d = first.slice(0, 8) + pad(n), past = d < today;
            var special = !past && !manual[d] && !!ruleFor(p, d, 'price');
            var cls = 'ad-day' + (past ? ' is-past' : d === st.pick ? ' is-pick' : manual[d] ? ' is-manual' : platform[d] ? ' is-platform' : '') + (special ? ' is-special' : '');
            var note = past ? '' : manual[d] ? 'Bloqueado' : platform[d] ? 'Reservado' : p.price.base > 0 || special ? money(nightPrice(p, d)) : '';
            html += '<button type="button" class="' + cls + '" data-act="day" data-date="' + d + '"' + (past ? ' disabled' : '') + ' aria-label="' + esc(human(d) + (note ? ', ' + note : '')) + '">' + n +
                (note && !manual[d] && !platform[d] ? '<small>' + note + '</small>' : '') + '</button>';
        }
        return html + '</div></div>';
    }
    function calendarHtml(p) {
        var info = st.platform[p.id];
        var month = st.month || today.slice(0, 8) + '01';
        var manual = daySet(p.blocked), platform = daySet(info && info.busy);
        return '<p class="ad-help">' + (st.pick ? 'Primer día: <strong>' + esc(human(st.pick)) + '</strong>. Pulse ahora el último día que quiere bloquear (o el mismo día para bloquear solo esa noche).'
            : 'Cada día muestra su precio por noche. Para bloquear fechas, pulse el primer día y después el último.') + '</p>' +
            '<div class="ad-cal-nav">' +
            '<button type="button" class="ad-icon-btn" data-act="nav" data-step="-1" aria-label="Mes anterior"' + (month <= today.slice(0, 8) + '01' ? ' disabled' : '') + '>' + fa('fa-chevron-left') + '</button>' +
            '<button type="button" class="ad-icon-btn" data-act="nav" data-step="1" aria-label="Mes siguiente">' + fa('fa-chevron-right') + '</button></div>' +
            '<div class="ad-months">' + monthHtml(p, month, manual, platform) + monthHtml(p, addMonths(month, 1), manual, platform) + '</div>' +
            '<p class="ad-legend"><span><i class="lg-free"></i>Libre</span><span><i class="lg-special"></i>Precio especial</span><span><i class="lg-manual"></i>Bloqueado por usted</span><span><i class="lg-platform"></i>Reservado en una plataforma</span></p>';
    }
    function tabPrecios(P, p) {
        if (!st.platform[p.id]) loadPlatform(p.id);
        var n = p.price.rules.length;
        var rules = (n ? p.price.rules.map(function (r, i) { return ruleHtml(P, r, i, n); }).join('') : '<p class="ad-empty">Sin precios especiales: se aplica la tarifa general todo el año.</p>') +
            '<button type="button" class="ad-btn ad-btn-small ad-add" data-act="add" data-list="' + P + 'price.rules" data-new="rule">' + fa('fa-plus') + 'Añadir precio por fechas</button>';
        var blocks = p.blocked.length ? p.blocked.map(function (b, i) {
            var nights = diff(b.start, b.end);
            return '<div class="ad-row"><p class="ad-block-dates">' + esc(human(b.start)) + ' → ' + esc(human(addDays(b.end, -1))) + '<small>' + nights + (nights === 1 ? ' noche' : ' noches') + '</small></p>' +
                '<div class="ad-row-body">' + field('Nota privada (opcional)', P + 'blocked.' + i + '.note', { placeholder: 'Ej.: uso propio, reserva por teléfono…' }) + '</div>' +
                tools(P + 'blocked', i, p.blocked.length, false) + '</div>';
        }).join('') : '<p class="ad-empty">No hay fechas bloqueadas a mano.</p>';

        // Sin ningún calendario conectado, la web no puede asegurar qué fechas están libres.
        var info = st.platform[p.id], connected = !info || info.loading || Object.keys(info.sources).some(function (k) { return info.sources[k] === 'ok'; });
        var broken = info && !info.loading && Object.keys(info.sources).some(function (k) { return info.sources[k] === 'error'; });
        return (broken ? '<p class="ad-banner"><strong>Un calendario de plataforma está fallando:</strong> mientras dure, la web muestra «disponibilidad por confirmar» en lugar de las fechas libres. Revise los enlaces en <em>iCal y enlaces</em>.</p>'
            : connected ? '' : '<p class="ad-banner"><strong>Este alojamiento no tiene ningún calendario conectado:</strong> ' + (st.data.demo
                ? 'la web muestra fechas ocupadas de ejemplo (modo demostración) y no tiene en cuenta sus bloqueos.'
                : 'la web muestra «disponibilidad por confirmar» y no marca fechas como libres.') + ' Conecte al menos uno en <em>iCal y enlaces</em>.</p>') +
            card('Tarifa general',
                grid(field('Precio base por noche', P + 'price.base', { kind: 'number', unit: '€', help: 'Con 0 la web muestra «Precio a consultar».' }),
                    field('Limpieza por estancia', P + 'price.cleaningFee', { kind: 'number', unit: '€' }),
                    field('Estancia mínima (noches)', P + 'price.minNights', { kind: 'stepper', min: 1, max: 60 })) +
                field('Precio orientativo', P + 'price.approx', { kind: 'check', help: 'La web dice «Precio total desde» y avisa de que puede variar según la temporada.' }), '', 'fa-tag') +
            card('Precios por fechas', rules, 'Temporadas, fines de semana, festivos u ofertas. Si dos periodos coinciden en una noche, se aplica el que esté más arriba en la lista.', 'fa-calendar-plus') +
            card('Calendario', '<div id="ad-cal">' + calendarHtml(p) + '</div>', '', 'fa-calendar-days') +
            card('Fechas bloqueadas por usted', blocks, 'Se suman a las reservas que llegan de las plataformas.', 'fa-ban');
    }
    function loadPlatform(id) {
        st.platform[id] = { loading: true };
        fetch('/api/availability?property=' + encodeURIComponent(id) + '&manual=0&t=' + Date.now())
            .then(function (r) { return r.ok ? r.json() : {}; }, function () { return {}; })
            .then(function (d) {
                st.platform[id] = { sources: d.sources || {}, busy: d.busy || [] };
                var p = current();
                if (p && p.id === id && (st.tab === 'precios' || st.tab === 'sync')) renderMain();
            });
    }
    // Repinta solo el calendario (mientras se escriben precios o fechas, sin perder el foco).
    function refreshCalendar() {
        var el = document.getElementById('ad-cal'), p = current();
        if (el && p) el.innerHTML = calendarHtml(p);
    }

    // ── Servicios ──
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

    // ── Fotos ──
    function tabFotos(P, p) {
        var n = p.gallery.length;
        var photos = n ? '<div class="ad-photos">' + p.gallery.map(function (src, i) {
            var shown = p.thumbs && !/^https:/i.test(src) ? src.replace(/([^\/]+)$/, 'thumbs/$1') : src;
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

    // ── Normas y ubicación ──
    function tabNormas(P, p) {
        var policies = [{ id: '', label: 'No mostrar', es: 'La ficha no incluye el apartado de cancelación.' }].concat(C.cancellation).map(function (c) {
            var on = (p.cancellation || '') === c.id;
            return '<button type="button" class="ad-option' + (on ? ' is-on' : '') + '" aria-pressed="' + on + '" data-act="set" data-path="' + P + 'cancellation" data-value="' + c.id + '" data-keep="1"><strong>' + esc(c.label) + '</strong><span>' + esc(c.es) + '</span></button>';
        }).join('');
        return card('Horarios', grid(field('Hora de entrada (a partir de)', P + 'checkIn', { kind: 'select', options: times() }),
            field('Hora de salida (antes de)', P + 'checkOut', { kind: 'select', options: times() })), '', 'fa-clock') +
            card('Normas de la casa', '<div class="ad-grid is-wide">' + C.house.map(function (h) {
                return seg(h.label, P + 'house.' + h.id, h.options.map(function (o) { return [o.id, o.label]; }));
            }).join('') + '</div>' +
                bi('Detalles sobre mascotas (opcional)', P + 'pets', { kind: 'area', rows: 2, help: 'Por ejemplo, número máximo o suplementos.' }),
                'Lo que marque aparece en la ficha; lo que deje sin marcar no se menciona.', 'fa-clipboard-list') +
            card('Política de cancelación', '<div class="ad-options">' + policies + '</div>', 'El texto se publica tal cual en la ficha, en español e inglés.', 'fa-calendar-xmark') +
            card('Ubicación',
                bi('Texto de la ubicación', P + 'locationText', { kind: 'area', rows: 3 }) +
                grid(field('Coordenadas o búsqueda para el mapa', P + 'mapQuery', { placeholder: '36.711145,-4.731890', help: 'Latitud y longitud separadas por una coma, o un nombre de lugar.' }),
                    field('Acercamiento del mapa', P + 'mapZoom', { kind: 'selectnum', options: ZOOMS })), '', 'fa-location-dot');
    }

    // ── Opiniones ──
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
            return grid(field('Plataforma', R + '.source', { kind: 'select', options: Object.keys(SOURCES).map(function (k) { return [k, SOURCES[k]]; }) }),
                field('Puntuación', R + '.rating', { kind: 'selectnum', options: scores }), field('Nombre del huésped', R + '.name')) +
                grid(reviewDate(R, r)) +
                field('Comentario', R + '.text', { kind: 'area', rows: 3, help: 'Vacío = valoración sin comentario.' });
        }, { move: true, tall: true }), 'Copie solo opiniones reales de sus anuncios. La escala (5 estrellas o sobre 10) se ajusta sola según la plataforma.', 'fa-star');
    }

    // ── Sincronización ──
    function tabSync(P, p) {
        var info = st.platform[p.id];
        if (!info) loadPlatform(p.id);
        var chips = Object.keys(SOURCES).map(function (k) {
            var s = info && info.sources ? info.sources[k] : '';
            var text = !info || info.loading ? 'consultando…' : s === 'ok' ? 'conectado' : s === 'error' ? 'error al leer el calendario' : 'sin conectar';
            return '<span class="ad-chip' + (s === 'ok' ? ' is-ok' : s === 'error' ? ' is-error' : '') + '">' + fa(s === 'ok' ? 'fa-circle-check' : s === 'error' ? 'fa-circle-exclamation' : 'fa-circle-minus') + SOURCES[k] + ': ' + text + '</span>';
        }).join('');
        return card('Calendarios de las plataformas (iCal)', '<div class="ad-chips">' + chips + '</div>' +
            grid(field('Enlace iCal de Airbnb', P + 'ical.airbnb', { placeholder: 'https://…' }), field('Enlace iCal de Vrbo', P + 'ical.vrbo', { placeholder: 'https://…' }),
                field('Enlace iCal de Booking', P + 'ical.booking', { placeholder: 'https://…' })),
            'Pegue el enlace de exportación de calendario de cada anuncio para que sus reservas se marquen solas como ocupadas. Son enlaces privados: no se muestran en la web. El estado se actualiza al guardar.', 'fa-rotate') +
            card('Enlaces a los anuncios',
                grid(field('Airbnb', P + 'links.airbnb', { placeholder: 'https://…' }), field('Vrbo', P + 'links.vrbo', { placeholder: 'https://…' }), field('Booking.com', P + 'links.booking', { placeholder: 'https://…' })),
                'Enlace público a cada anuncio (debe empezar por https://). Si se deja vacío, el botón no aparece en la ficha.', 'fa-arrow-up-right-from-square');
    }

    // ── Vistas ──
    function propertyView() {
        var p = current(), P = 'properties.' + st.view + '.';
        var body = { info: tabInfo, precios: tabPrecios, servicios: tabServicios, fotos: tabFotos, normas: tabNormas, opiniones: tabOpiniones, sync: tabSync }[st.tab](P, p);
        return '<div class="ad-head"><h2>' + esc((p.name.es || 'Sin nombre').split(' | ')[0]) + '</h2>' + (p.hidden ? '<span class="ad-tag">Oculto</span>' : '<span class="ad-tag is-ok">Visible</span>') +
            '<a class="ad-btn ad-btn-small" target="_blank" rel="noopener" href="propiedad.html?casa=' + encodeURIComponent(p.slug) + '">' + fa('fa-arrow-up-right-from-square') + 'Ver en la web</a>' +
            '<button type="button" class="ad-btn ad-btn-small ad-btn-danger" data-act="del-prop">' + fa('fa-trash') + 'Eliminar</button></div>' +
            '<div class="ad-tabs" role="tablist">' + TABS.map(function (t) {
                return '<button type="button" role="tab" class="ad-tab' + (t[0] === st.tab ? ' is-active' : '') + '" aria-selected="' + (t[0] === st.tab) + '" data-act="tab" data-t="' + t[0] + '">' + fa(t[2]) + t[1] + '</button>';
            }).join('') + '</div>' + body;
    }
    function settingsView() {
        return '<div class="ad-head"><h2>Ajustes generales</h2></div>' +
            card('Contacto',
                grid(field('Teléfono (como se muestra)', 'contact.phone', { placeholder: '+34 600 000 000' }), field('Teléfono para llamar', 'contact.tel', { placeholder: '+34600000000', help: 'Sin espacios.' }),
                    field('WhatsApp', 'contact.whatsapp', { placeholder: '34600000000', help: 'Solo números, con el prefijo del país.' }), field('Email', 'contact.email')),
                'Datos de contacto que aparecen en todas las fichas de alojamiento.', 'fa-phone') +
            card('Calendario público', field('Modo demostración', 'demo', { kind: 'check', help: 'Solo afecta a los alojamientos que aún no tienen ningún calendario conectado. Activado: la web muestra fechas de ejemplo y un aviso de «página en preparación». Desactivado: dice que la disponibilidad está por confirmar. Con algún calendario conectado, la web usa siempre las fechas reales y sus bloqueos.' }), '', 'fa-calendar-days') +
            card('Copia de seguridad', '<button type="button" class="ad-btn" data-act="export">' + fa('fa-download') + 'Descargar copia de los datos</button>',
                'Descarga un archivo con todos los datos tal como están ahora en el panel.', 'fa-download');
    }
    function renderTop() {
        var el = root.querySelector('.ad-top-actions');
        if (!el) return;
        var state = st.saving ? ['is-saving', 'fa-spinner fa-spin', 'Guardando…'] : st.failed ? ['is-failed', 'fa-circle-exclamation', 'No se ha guardado']
            : st.dirty ? ['is-dirty', 'fa-circle', 'Cambios sin guardar'] : ['is-saved', 'fa-circle-check', 'Todo guardado'];
        el.innerHTML = '<span class="ad-state ' + state[0] + '" role="status">' + fa(state[1]) + state[2] + '</span>' +
            '<button type="button" class="ad-btn ad-btn-solid" data-act="save"' + (st.dirty && !st.saving ? '' : ' disabled') + '>' + fa(st.saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk') + (st.failed ? 'Reintentar' : 'Guardar') + '</button>' +
            '<button type="button" class="ad-btn" data-act="logout" aria-label="Cerrar sesión">' + fa('fa-right-from-bracket') + '<span>Salir</span></button>';
    }
    function renderSide() {
        var el = root.querySelector('.ad-side');
        if (!el) return;
        el.innerHTML = '<p class="ad-side-title">Alojamientos</p>' + st.data.properties.map(function (p, i) {
            return '<button type="button" class="ad-side-item' + (st.view === i ? ' is-active' : '') + '" data-act="view" data-v="' + i + '">' + fa('fa-house') + '<span>' +
                esc((p.name.es || 'Sin nombre').split(' | ')[0]) + '</span>' + (p.hidden ? '<small>Oculto</small>' : '') + '</button>';
        }).join('') +
            '<button type="button" class="ad-side-item" data-act="add-prop">' + fa('fa-plus') + '<span>Añadir alojamiento</span></button>' +
            '<p class="ad-side-title">Web</p>' +
            '<button type="button" class="ad-side-item' + (st.view === 'settings' ? ' is-active' : '') + '" data-act="view" data-v="settings">' + fa('fa-gear') + '<span>Ajustes generales</span></button>';
    }
    function renderMain() {
        var el = root.querySelector('.ad-main');
        if (!el) return;
        el.innerHTML = (st.fresh ? '<p class="ad-banner"><strong>Primera vez:</strong> estos datos vienen del archivo de la web. Pulse <strong>Guardar</strong> para que, a partir de ahora, la web muestre lo que edite aquí.</p>' : '') +
            (st.view === 'settings' ? settingsView() : propertyView());
    }
    function render() {
        root.innerHTML = '<header class="ad-top"><img src="LOGO.png" alt=""><h1>Panel de alojamientos</h1><div class="ad-top-actions" style="display:contents"></div></header>' +
            '<div class="ad-shell"><nav class="ad-side" aria-label="Secciones"></nav><main class="ad-main"></main></div>';
        renderTop();
        renderSide();
        renderMain();
    }
    // Tras repintar, devuelve el foco al botón equivalente al que se pulsó.
    function refocus(b) {
        var sel = ['act', 'path', 'value', 'list', 'i', 'd', 't', 'date'].map(function (k) {
            return b.hasAttribute('data-' + k) ? '[data-' + k + '="' + b.getAttribute('data-' + k) + '"]' : '';
        }).join('');
        var el = sel && root.querySelector('.ad-main ' + sel);
        if (el && !el.disabled) el.focus({ preventScroll: true });
    }

    // ── Eventos ──
    root.addEventListener('input', function (e) {
        var el = e.target;
        if (!st.data) return;
        // Mes y año de una opinión: se guarda el texto de la fecha en los dos idiomas.
        if (el.hasAttribute('data-date')) {
            var R = el.getAttribute('data-date');
            var part = function (name) { return +root.querySelector('[data-date="' + R + '"][data-part="' + name + '"]').value; };
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

        var p = current();
        if (/\.reviews\.\d+\.source$/.test(path)) {
            // La escala de puntuación depende de la plataforma.
            var review = get(path.replace(/\.source$/, ''));
            if (review.max !== SCALE[v]) { review.rating = review.max = SCALE[v]; renderMain(); }
        } else if (/\.price\.rules\.\d+\.name$/.test(path) && v === 'Fines de semana') {
            var rule = get(path.replace(/\.name$/, ''));
            if (!rule.days.length) { rule.days = [4, 5]; renderMain(); }
        } else if (/\.hidden$/.test(path) || /\.price\.rules\.\d+\.repeat$/.test(path)) {
            renderMain();
        } else if (p && st.tab === 'precios' && /\.price\./.test(path)) {
            refreshCalendar();
        }
    });

    root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || b.disabled || !st.data) return;
        var act = b.getAttribute('data-act'), p = current();
        var path = b.getAttribute('data-path'), value = b.getAttribute('data-value');
        var items = b.hasAttribute('data-list') ? get(b.getAttribute('data-list')) : null;
        var i = +b.getAttribute('data-i');
        var syncCover = function () { if (p) p.image = p.gallery[0] || ''; };
        var isRules = /\.price\.rules$/.test(b.getAttribute('data-list') || '');

        if (act === 'save') return save();
        if (act === 'logout') {
            if (st.dirty && !confirm('Hay cambios sin guardar que se perderán. ¿Salir de todos modos?')) return;
            st.dirty = false;
            return api('POST', { action: 'logout' }).then(function () { st.data = null; renderLogin(load); });
        }
        if (act === 'view') {
            var v = b.getAttribute('data-v');
            st.view = v === 'settings' ? v : +v;
            st.pick = st.month = st.rule = null;
            renderSide();
            renderMain();
            return window.scrollTo(0, 0);
        }
        if (act === 'tab') { st.tab = b.getAttribute('data-t'); st.pick = st.rule = null; renderMain(); return refocus(b); }
        if (act === 'rule') { st.rule = st.rule === i ? null : i; renderMain(); return refocus(b); }
        if (act === 'nav') { st.month = addMonths(st.month || today.slice(0, 8) + '01', +b.getAttribute('data-step')); return refreshCalendar(); }
        if (act === 'export') {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(st.data, null, 2)], { type: 'application/json' }));
            a.download = 'vellum-alojamientos-' + today + '.json';
            a.click();
            return setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        }
        if (act === 'add-prop') {
            var name = prompt('Nombre del nuevo alojamiento:');
            if (!name || !name.trim()) return;
            st.data.properties.push(emptyProperty(name.trim()));
            st.view = st.data.properties.length - 1;
            st.tab = 'info';
            st.rule = null;
            touch();
            renderMain();
            return toast('Alojamiento creado y oculto: complételo y desmarque «Ocultar» cuando esté listo.');
        }
        if (act === 'del-prop') {
            if (!confirm('¿Eliminar «' + (p.name.es || p.id) + '» con todos sus datos? Se aplicará al pulsar Guardar.')) return;
            st.data.properties.splice(st.view, 1);
            st.view = st.data.properties.length ? 0 : 'settings';
            st.rule = null;
        } else if (act === 'set') {
            // Opción única: pulsar la que ya está activa la desmarca (salvo data-keep).
            set(path, get(path) === value && !b.hasAttribute('data-keep') ? '' : value);
        } else if (act === 'toggle') {
            var arr = get(path), item = b.hasAttribute('data-num') ? +value : value, at = arr.indexOf(item);
            if (at >= 0) arr.splice(at, 1);
            else if (b.hasAttribute('data-max') && arr.length >= +b.getAttribute('data-max')) return toast('Como máximo ' + b.getAttribute('data-max') + ' destacados. Quite uno para añadir otro.', true);
            else arr.push(item);
            if (b.hasAttribute('data-num')) arr.sort();
            // Un servicio desmarcado deja de estar destacado.
            if (/\.services$/.test(path) && at >= 0 && p.featured.indexOf(item) >= 0) p.featured.splice(p.featured.indexOf(item), 1);
        } else if (act === 'step') {
            set(path, Math.min(+b.getAttribute('data-max'), Math.max(+b.getAttribute('data-min'), (Number(get(path)) || 0) + (+b.getAttribute('data-d')))));
        } else if (act === 'add') {
            items.push(NEW[b.getAttribute('data-new')](p));
            if (isRules) st.rule = items.length - 1;
        } else if (act === 'del') {
            items.splice(i, 1);
            if (isRules) st.rule = null;
            syncCover();
        } else if (act === 'move') {
            var j = i + (+b.getAttribute('data-d'));
            items.splice(j, 0, items.splice(i, 1)[0]);
            if (isRules) st.rule = null;
            syncCover();
        } else if (act === 'cover') {
            p.gallery.unshift(p.gallery.splice(i, 1)[0]);
            syncCover();
        } else if (act === 'add-photo') {
            var box = document.getElementById('ad-new-photo'), src = box.value.trim();
            if (!/^https:\/\/\S+$/i.test(src) && !/^[^:<>"'\\]+\.(jpe?g|png|webp|avif)$/i.test(src)) {
                box.classList.add('is-bad');
                return toast('Escriba la ruta de una imagen (jpg, png, webp o avif) o una dirección https.', true);
            }
            if (p.gallery.indexOf(src) >= 0) return toast('Esa foto ya está en la galería.', true);
            p.gallery.push(src);
            syncCover();
        } else if (act === 'day') {
            var d = b.getAttribute('data-date');
            if (!st.pick) { st.pick = d; refreshCalendar(); return refocus(b); }
            var from = d < st.pick ? d : st.pick, to = d < st.pick ? st.pick : d;
            p.blocked.push({ start: from, end: addDays(to, 1), note: '' });
            p.blocked.sort(function (x, y) { return x.start < y.start ? -1 : 1; });
            st.pick = null;
        } else return;
        touch();
        renderMain();
        refocus(b);
    });

    load();
})();
