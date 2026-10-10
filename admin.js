// Panel privado de alojamientos (/admin). Lee y guarda los datos mediante /api/admin.
(function () {
    var root = document.getElementById('admin');
    if (!root) return;

    // view: índice de la propiedad abierta o 'settings'. pick: primer día elegido al bloquear fechas.
    var st = { data: null, view: 0, tab: 'general', dirty: false, fresh: false, saving: false, month: null, pick: null, platform: {} };

    var DAY = 86400000;
    var now = new Date();
    var today = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
    var SOURCES = { airbnb: 'Airbnb', vrbo: 'Vrbo', booking: 'Booking.com' };
    var TABS = [['general', 'General'], ['precios', 'Precios'], ['disponibilidad', 'Disponibilidad'], ['fotos', 'Fotos'],
        ['servicios', 'Servicios'], ['normas', 'Normas y ubicación'], ['opiniones', 'Opiniones'], ['enlaces', 'Enlaces']];
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
    function addDays(s, n) { return iso(new Date(date(s).getTime() + n * DAY)); }
    function addMonths(s, n) { var d = date(s); return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))); }
    function diff(a, b) { return Math.round((date(b) - date(a)) / DAY); }
    function human(s) { return date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    function monthName(s) { var m = date(s).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }); return m.charAt(0).toUpperCase() + m.slice(1); }
    function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
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
        el.textContent = text;
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
            name: { es: name, en: name }, location: { es: '', en: '' }, province: 'Málaga', license: '',
            image: '', imageAlt: { es: '', en: '' }, thumbs: false, gallery: [],
            summary: { es: '', en: '' }, guests: 2, bedrooms: 1, bathrooms: 1, toilets: 0,
            description: { es: '', en: '' }, highlights: [], amenities: [],
            locationText: { es: '', en: '' }, mapQuery: '', mapZoom: 14, checkIn: '15:00', checkOut: '10:00',
            pets: { es: '', en: '' },
            price: { base: 0, seasons: [], cleaningFee: 0, minNights: 1, approx: false },
            reviews: [], links: { airbnb: '', vrbo: '', booking: '' },
            ical: { airbnb: '', vrbo: '', booking: '' }, blocked: [], demoBusy: []
        };
    }
    // Completa los campos que falten (los datos del archivo no traen iCal ni bloqueos).
    function normalize(data) {
        data.contact = data.contact || {};
        data.properties = (data.properties || []).map(function (p) {
            var base = emptyProperty('');
            Object.keys(base).forEach(function (k) {
                if (p[k] == null) p[k] = base[k];
                else if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
                    Object.keys(base[k]).forEach(function (j) { if (p[k][j] == null) p[k][j] = base[k][j]; });
                }
            });
            return p;
        });
        return data;
    }
    function touch() {
        st.dirty = true;
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
            api('POST', { action: 'login', password: password.value }).then(function (res) {
                if (res.status === 200) return then();
                if (res.error === 'store_not_configured' || res.error === 'password_not_configured') return renderSetup(res.error);
                button.disabled = false;
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
            st.data = normalize(res.data || JSON.parse(JSON.stringify(window.VELLUM_PROPERTIES || { demo: true, contact: {}, properties: [] })));
            st.dirty = st.fresh;
            if (!st.data.properties.length) st.view = 'settings';
            render();
        });
    }
    function save() {
        if (st.saving) return;
        st.saving = true;
        renderTop();
        api('POST', { action: 'save', data: st.data }).then(function (res) {
            st.saving = false;
            if (res.status === 401) return renderLogin(function () { render(); save(); });
            if (res.status !== 200) { renderTop(); return toast(message(res), true); }
            st.data = normalize(res.data);
            st.dirty = st.fresh = false;
            st.platform = {};
            if (st.view !== 'settings' && !st.data.properties[st.view]) st.view = st.data.properties.length ? 0 : 'settings';
            render();
            toast('Guardado. Los cambios se verán en la web en un minuto aproximadamente.');
        });
    }

    // ── Campos de formulario ──
    // kind: text (por defecto), number, area, lines (una línea por elemento), check, md (día/mes), select, selectnum
    function field(label, path, o) {
        o = o || {};
        var kind = o.kind || 'text', v = get(path);
        if (v == null) v = '';
        var attrs = ' data-path="' + path + '" data-kind="' + kind + '"' + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '');
        var help = o.help ? '<span class="ad-help">' + o.help + '</span>' : '';
        if (kind === 'check') return '<label class="ad-check"><input type="checkbox"' + attrs + (v ? ' checked' : '') + '><span>' + label + (help ? '<br>' + help : '') + '</span></label>';
        var control;
        if (kind === 'area' || kind === 'lines') {
            control = '<textarea rows="' + (o.rows || 3) + '"' + attrs + '>' + esc(kind === 'lines' ? (v || []).join('\n') : v) + '</textarea>';
        } else if (kind === 'select' || kind === 'selectnum') {
            control = '<select' + attrs + '>' + o.options.map(function (op) {
                return '<option value="' + esc(op[0]) + '"' + (String(op[0]) === String(v) ? ' selected' : '') + '>' + esc(op[1]) + '</option>';
            }).join('') + '</select>';
        } else if (kind === 'number') {
            control = '<input type="number" inputmode="decimal" min="' + (o.min || 0) + '"' + (o.step ? ' step="' + o.step + '"' : '') + attrs + ' value="' + esc(v) + '">';
        } else {
            if (kind === 'md' && v) v = v.slice(3) + '/' + v.slice(0, 2);
            control = '<input type="text"' + attrs + ' value="' + esc(v) + '">';
        }
        if (o.icon) control = '<span class="ad-icon-field"><i class="' + iconClass(v) + '" aria-hidden="true"></i>' + control + '</span>';
        return '<label class="ad-field"><span class="ad-label">' + label + '</span>' + control + help + '</label>';
    }
    function bi(label, path, o) {
        return '<div class="ad-bi">' + field(label + ' · Español', path + '.es', o) + field(label + ' · English', path + '.en', o) + '</div>';
    }
    function grid() { return '<div class="ad-grid">' + Array.prototype.join.call(arguments, '') + '</div>'; }
    function card(title, html, help) {
        return '<section class="ad-card">' + (title ? '<h3>' + title + '</h3>' : '') + (help ? '<p class="ad-help">' + help + '</p>' : '') + html + '</section>';
    }
    function iconClass(name) { return (String(name).indexOf('fa-regular') === 0 || String(name).indexOf('fa-brands') === 0 ? '' : 'fa-solid ') + esc(name); }
    function tools(listPath, i, n, move) {
        return '<div class="ad-row-tools">' +
            (move ? '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + listPath + '" data-i="' + i + '" data-d="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>' +
                '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + listPath + '" data-i="' + i + '" data-d="1" aria-label="Bajar"' + (i === n - 1 ? ' disabled' : '') + '><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>' : '') +
            '<button type="button" class="ad-icon-btn is-danger" data-act="del" data-list="' + listPath + '" data-i="' + i + '" aria-label="Eliminar"><i class="fa-solid fa-trash" aria-hidden="true"></i></button></div>';
    }
    // Lista editable: una fila por elemento, con sus botones, y el botón de añadir.
    function rows(listPath, kind, addLabel, rowHtml, o) {
        o = o || {};
        var items = get(listPath) || [];
        return (items.length ? items.map(function (item, i) {
            return '<div class="ad-row' + (o.tall ? ' is-tall' : '') + '"><div class="ad-row-body">' + rowHtml(listPath + '.' + i, item) + '</div>' + tools(listPath, i, items.length, o.move) + '</div>';
        }).join('') : '<p class="ad-empty">' + (o.empty || 'Todavía no hay ninguno.') + '</p>') +
            '<button type="button" class="ad-btn ad-btn-small ad-add" data-act="add" data-list="' + listPath + '" data-new="' + kind + '"><i class="fa-solid fa-plus" aria-hidden="true"></i>' + addLabel + '</button>';
    }
    var NEW = {
        season: function () { return { from: '06-15', to: '09-15', price: 0 }; },
        highlight: function () { return { icon: 'fa-check', es: '', en: '' }; },
        amenity: function () { return { icon: 'fa-check', title: { es: '', en: '' }, items: { es: [], en: [] } }; },
        review: function () { return { source: 'airbnb', name: '', date: { es: '', en: '' }, rating: 5, max: 5, text: '' }; }
    };
    var ICON_HELP = 'Nombre de un icono de <a href="https://fontawesome.com/v6/search?o=r&m=free&s=solid" target="_blank" rel="noopener noreferrer">Font Awesome</a>, por ejemplo <code>fa-wifi</code>.';

    // ── Pestañas de un alojamiento ──
    function tabGeneral(P, p) {
        return card('Nombre y situación',
            bi('Título', P + 'name', { help: 'Si escribe «Nombre | Subtítulo», lo que va tras la barra se muestra como subtítulo.' }) +
            bi('Zona o municipio', P + 'location') +
            grid(field('Provincia', P + 'province'), field('Nº de registro turístico', P + 'license'),
                field('Dirección web', P + 'slug', { help: 'propiedad.html?casa=<strong>' + esc(p.slug) + '</strong>. Si la cambia, los enlaces antiguos dejan de funcionar.' }))) +
            card('Capacidad', grid(field('Huéspedes', P + 'guests', { kind: 'number', min: 1 }), field('Dormitorios', P + 'bedrooms', { kind: 'number' }),
                field('Baños', P + 'bathrooms', { kind: 'number' }), field('Aseos', P + 'toilets', { kind: 'number' }))) +
            card('Textos',
                bi('Resumen corto (ficha del listado)', P + 'summary', { kind: 'area', rows: 3 }) +
                bi('Descripción completa', P + 'description', { kind: 'area', rows: 8 })) +
            card('Visibilidad', field('Ocultar este alojamiento en la web', P + 'hidden', { kind: 'check', help: 'Sigue guardado en el panel, pero los visitantes no lo ven.' }));
    }
    function tabPrecios(P) {
        return card('Tarifa',
            grid(field('Precio base por noche (€)', P + 'price.base', { kind: 'number', help: 'Con 0 la web muestra «Precio a consultar».' }),
                field('Limpieza por estancia (€)', P + 'price.cleaningFee', { kind: 'number' }),
                field('Estancia mínima (noches)', P + 'price.minNights', { kind: 'number', min: 1 })) +
            field('Precio orientativo', P + 'price.approx', { kind: 'check', help: 'La web dice «Precio total desde» y avisa de que puede variar según la temporada.' })) +
            card('Temporadas', rows(P + 'price.seasons', 'season', 'Añadir temporada', function (R) {
                return grid(field('Desde (día/mes)', R + '.from', { kind: 'md', placeholder: '15/06' }), field('Hasta (día/mes)', R + '.to', { kind: 'md', placeholder: '15/09' }),
                    field('Precio por noche (€)', R + '.price', { kind: 'number' }));
            }, { empty: 'Sin temporadas: se aplica el precio base todo el año.' }),
            'Entre esas fechas (ambas incluidas, se repite cada año) el precio de la temporada sustituye al precio base. Si dos temporadas coinciden, manda la que esté más arriba.');
    }
    function daySet(ranges) {
        var days = {};
        (ranges || []).forEach(function (r) { for (var d = r.start; d < r.end; d = addDays(d, 1)) days[d] = true; });
        return days;
    }
    function monthHtml(first, manual, platform) {
        var d0 = date(first), offset = (d0.getUTCDay() + 6) % 7;
        var count = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 0)).getUTCDate();
        var html = '<div><p class="ad-month-name">' + esc(monthName(first)) + '</p><div class="ad-days">';
        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(function (n) { html += '<span class="ad-dow">' + n + '</span>'; });
        for (var i = 0; i < offset; i++) html += '<span></span>';
        for (var n = 1; n <= count; n++) {
            var d = first.slice(0, 8) + pad(n);
            var cls = 'ad-day' + (d < today ? ' is-past' : d === st.pick ? ' is-pick' : manual[d] ? ' is-manual' : platform[d] ? ' is-platform' : '');
            html += '<button type="button" class="' + cls + '" data-act="day" data-date="' + d + '"' + (d < today ? ' disabled' : '') + ' aria-label="' + esc(human(d)) + '">' + n + '</button>';
        }
        return html + '</div></div>';
    }
    function tabDisponibilidad(P, p) {
        var info = st.platform[p.id];
        if (!info) loadPlatform(p.id);
        var chips = Object.keys(SOURCES).map(function (k) {
            var s = info && info.sources ? info.sources[k] : '';
            var text = !info ? 'consultando…' : s === 'ok' ? 'conectado' : s === 'error' ? 'error al leer el calendario' : 'sin conectar';
            return '<span class="ad-chip' + (s === 'ok' ? ' is-ok' : s === 'error' ? ' is-error' : '') + '">' + SOURCES[k] + ': ' + text + '</span>';
        }).join('');
        var month = st.month || today.slice(0, 8) + '01';
        var manual = daySet(p.blocked), platform = daySet(info && info.busy);
        var calendar = '<div class="ad-cal-nav">' +
            '<button type="button" class="ad-icon-btn" data-act="nav" data-step="-1" aria-label="Mes anterior"' + (month <= today.slice(0, 8) + '01' ? ' disabled' : '') + '><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>' +
            '<button type="button" class="ad-icon-btn" data-act="nav" data-step="1" aria-label="Mes siguiente"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button></div>' +
            '<div class="ad-months">' + monthHtml(month, manual, platform) + monthHtml(addMonths(month, 1), manual, platform) + '</div>' +
            '<p class="ad-legend"><span><i style="background:#f6d5d2"></i>Bloqueado por usted</span><span><i style="background:#dfe3ea"></i>Reservado en una plataforma</span><span><i style="background:#f3f6f1"></i>Libre</span></p>';
        var blocks = p.blocked.length ? p.blocked.map(function (b, i) {
            var n = diff(b.start, b.end);
            return '<div class="ad-row"><p class="ad-block-dates">' + esc(human(b.start)) + ' → ' + esc(human(addDays(b.end, -1))) + '<small>' + n + (n === 1 ? ' noche' : ' noches') + '</small></p>' +
                '<div class="ad-row-body">' + field('Nota privada (opcional)', P + 'blocked.' + i + '.note', { placeholder: 'Ej.: uso propio, reserva por teléfono…' }) + '</div>' +
                tools(P + 'blocked', i, p.blocked.length, false) + '</div>';
        }).join('') : '<p class="ad-empty">No hay fechas bloqueadas a mano.</p>';

        return (st.data.demo ? '<p class="ad-banner"><strong>La web está en modo demostración:</strong> el calendario público muestra fechas de ejemplo y no tiene en cuenta estos bloqueos. Se desactiva en <em>Ajustes generales</em>.</p>' : '') +
            card('Bloquear fechas', calendar,
                st.pick ? 'Primer día: <strong>' + esc(human(st.pick)) + '</strong>. Pulse ahora el último día que quiere bloquear (o el mismo día para bloquear solo esa noche).'
                    : 'Pulse el primer día y después el último día que quiere bloquear. Estas fechas se suman a las reservas de las plataformas.') +
            card('Fechas bloqueadas por usted', blocks) +
            card('Calendarios de las plataformas', '<div class="ad-chips">' + chips + '</div>' +
                grid(field('Enlace iCal de Airbnb', P + 'ical.airbnb', { placeholder: 'https://…' }), field('Enlace iCal de Vrbo', P + 'ical.vrbo', { placeholder: 'https://…' }),
                    field('Enlace iCal de Booking', P + 'ical.booking', { placeholder: 'https://…' })),
                'Pegue aquí el enlace de exportación de calendario (iCal) de cada anuncio para que sus reservas se marquen solas como ocupadas. Son enlaces privados: no se muestran en la web. El estado se actualiza al guardar.');
    }
    function loadPlatform(id) {
        st.platform[id] = { loading: true };
        fetch('/api/availability?property=' + encodeURIComponent(id) + '&manual=0&t=' + Date.now())
            .then(function (r) { return r.ok ? r.json() : {}; }, function () { return {}; })
            .then(function (d) {
                st.platform[id] = { sources: d.sources || {}, busy: d.busy || [] };
                var p = current();
                if (p && p.id === id && st.tab === 'disponibilidad') renderMain();
            });
    }
    function tabFotos(P, p) {
        var n = p.gallery.length;
        var photos = n ? '<div class="ad-photos">' + p.gallery.map(function (src, i) {
            var shown = p.thumbs && !/^https:/i.test(src) ? src.replace(/([^\/]+)$/, 'thumbs/$1') : src;
            return '<figure class="ad-photo' + (i === 0 ? ' is-cover' : '') + '">' + (i === 0 ? '<span class="ad-photo-tag">Portada</span>' : '') +
                '<img src="' + esc(shown) + '" alt="" loading="lazy" title="' + esc(src) + '"><figcaption>' +
                '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + P + 'gallery" data-i="' + i + '" data-d="-1" aria-label="Mover antes"' + (i === 0 ? ' disabled' : '') + '><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>' +
                '<button type="button" class="ad-icon-btn" data-act="cover" data-i="' + i + '" aria-label="Poner como portada" title="Poner como portada"' + (i === 0 ? ' disabled' : '') + '><i class="fa-solid fa-star" aria-hidden="true"></i></button>' +
                '<button type="button" class="ad-icon-btn" data-act="move" data-list="' + P + 'gallery" data-i="' + i + '" data-d="1" aria-label="Mover después"' + (i === n - 1 ? ' disabled' : '') + '><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>' +
                '<button type="button" class="ad-icon-btn is-danger" data-act="del" data-list="' + P + 'gallery" data-i="' + i + '" aria-label="Quitar de la galería" title="Quitar de la galería"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' +
                '</figcaption></figure>';
        }).join('') + '</div>' : '<p class="ad-empty">Este alojamiento todavía no tiene fotos.</p>';
        return card('Galería (' + n + ')', photos, 'Las fotos se ven en este orden y la primera es la portada. Quitar una foto de la galería no borra el archivo.') +
            card('Añadir una foto', '<div class="ad-inline">' +
                '<label class="ad-field"><span class="ad-label">Ruta del archivo o dirección https</span><input type="text" id="ad-new-photo" placeholder="fotos/' + esc(p.id) + '/46.jpg"></label>' +
                '<button type="button" class="ad-btn" data-act="add-photo"><i class="fa-solid fa-plus" aria-hidden="true"></i>Añadir</button></div>',
                'El panel no sube archivos: suba antes la foto a GitHub, dentro de la carpeta <code>fotos/' + esc(p.id) + '/</code>, y escriba aquí su ruta.') +
            card('Opciones',
                bi('Descripción de la foto de portada (accesibilidad y buscadores)', P + 'imageAlt') +
                field('Usar miniaturas', P + 'thumbs', { kind: 'check', help: 'Actívelo solo si cada foto tiene una copia pequeña con el mismo nombre en la subcarpeta <code>thumbs</code>.' }));
    }
    function tabServicios(P) {
        return card('Destacados', rows(P + 'highlights', 'highlight', 'Añadir destacado', function (R) {
            return grid(field('Icono', R + '.icon', { icon: true }), field('Texto · Español', R + '.es'), field('Texto · English', R + '.en'));
        }, { move: true }), 'Recuadros que aparecen arriba en la página del alojamiento, junto a huéspedes, dormitorios y baños. ' + ICON_HELP) +
            card('Qué incluye', rows(P + 'amenities', 'amenity', 'Añadir grupo', function (R) {
                return grid(field('Icono', R + '.icon', { icon: true }), field('Título · Español', R + '.title.es'), field('Título · English', R + '.title.en')) +
                    '<div class="ad-bi">' + field('Elementos · Español (uno por línea)', R + '.items.es', { kind: 'lines', rows: 5 }) +
                    field('Elementos · English (uno por línea)', R + '.items.en', { kind: 'lines', rows: 5 }) + '</div>';
            }, { move: true, tall: true }), 'Servicios agrupados por zonas (exterior, cocina, baño…).');
    }
    function tabNormas(P) {
        return card('Normas de la casa',
            grid(field('Hora de entrada', P + 'checkIn', { placeholder: '15:00' }), field('Hora de salida', P + 'checkOut', { placeholder: '10:00' })) +
            bi('Mascotas', P + 'pets', { kind: 'area', rows: 2, help: 'Si se deja vacío, el apartado no aparece.' })) +
            card('Ubicación',
                bi('Texto de la ubicación', P + 'locationText', { kind: 'area', rows: 3 }) +
                grid(field('Coordenadas o búsqueda para el mapa', P + 'mapQuery', { placeholder: '36.711145,-4.731890', help: 'Latitud y longitud separadas por una coma, o un nombre de lugar.' }),
                    field('Acercamiento del mapa (1-20)', P + 'mapZoom', { kind: 'number', min: 1 })));
    }
    function tabOpiniones(P) {
        return card('Opiniones de huéspedes', rows(P + 'reviews', 'review', 'Añadir opinión', function (R) {
            return grid(field('Plataforma', R + '.source', { kind: 'select', options: Object.keys(SOURCES).map(function (k) { return [k, SOURCES[k]]; }) }),
                field('Nombre', R + '.name'), field('Puntuación', R + '.rating', { kind: 'number', step: '0.1' }),
                field('Escala', R + '.max', { kind: 'selectnum', options: [[5, 'Sobre 5'], [10, 'Sobre 10']] })) +
                grid(field('Fecha · Español', R + '.date.es', { placeholder: 'agosto de 2026' }), field('Fecha · English', R + '.date.en', { placeholder: 'August 2026' })) +
                field('Comentario', R + '.text', { kind: 'area', rows: 3, help: 'Vacío = valoración sin comentario.' });
        }, { move: true, tall: true }), 'Copie solo opiniones reales de sus anuncios. Sobre 5 las puntuaciones son enteras (estrellas).');
    }
    function tabEnlaces(P) {
        return card('Anuncios en las plataformas',
            grid(field('Airbnb', P + 'links.airbnb', { placeholder: 'https://…' }), field('Vrbo', P + 'links.vrbo', { placeholder: 'https://…' }), field('Booking.com', P + 'links.booking', { placeholder: 'https://…' })),
            'Enlace público a cada anuncio (debe empezar por https://). Si se deja vacío, el botón no aparece.');
    }

    // ── Vistas ──
    function propertyView() {
        var p = current(), P = 'properties.' + st.view + '.';
        var body = { general: tabGeneral, precios: tabPrecios, disponibilidad: tabDisponibilidad, fotos: tabFotos, servicios: tabServicios, normas: tabNormas, opiniones: tabOpiniones, enlaces: tabEnlaces }[st.tab](P, p);
        return '<div class="ad-head"><h2>' + esc((p.name.es || 'Sin nombre').split(' | ')[0]) + '</h2>' +
            '<a class="ad-btn ad-btn-small" target="_blank" rel="noopener" href="propiedad.html?casa=' + encodeURIComponent(p.slug) + '"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>Ver en la web</a>' +
            '<button type="button" class="ad-btn ad-btn-small ad-btn-danger" data-act="del-prop"><i class="fa-solid fa-trash" aria-hidden="true"></i>Eliminar</button></div>' +
            '<div class="ad-tabs" role="tablist">' + TABS.map(function (t) {
                return '<button type="button" role="tab" class="ad-tab' + (t[0] === st.tab ? ' is-active' : '') + '" aria-selected="' + (t[0] === st.tab) + '" data-act="tab" data-t="' + t[0] + '">' + t[1] + '</button>';
            }).join('') + '</div>' + body;
    }
    function settingsView() {
        return '<div class="ad-head"><h2>Ajustes generales</h2></div>' +
            card('Contacto',
                grid(field('Teléfono (como se muestra)', 'contact.phone', { placeholder: '+34 600 000 000' }), field('Teléfono para llamar', 'contact.tel', { placeholder: '+34600000000', help: 'Sin espacios.' }),
                    field('WhatsApp', 'contact.whatsapp', { placeholder: '34600000000', help: 'Solo números, con el prefijo del país.' }), field('Email', 'contact.email')),
                'Datos de contacto que aparecen en todas las fichas de alojamiento.') +
            card('Calendario público', field('Modo demostración', 'demo', { kind: 'check', help: 'Activado: la web muestra fechas ocupadas de ejemplo y un aviso de «página en preparación». Desactivado: usa los calendarios reales de las plataformas y sus bloqueos.' })) +
            card('Copia de seguridad', '<button type="button" class="ad-btn" data-act="export"><i class="fa-solid fa-download" aria-hidden="true"></i>Descargar copia de los datos</button>',
                'Descarga un archivo con todos los datos tal como están ahora en el panel.');
    }
    function renderTop() {
        var el = root.querySelector('.ad-top-actions');
        if (!el) return;
        el.innerHTML = '<span class="ad-state' + (st.dirty ? ' is-dirty' : '') + '">' + (st.saving ? 'Guardando…' : st.dirty ? 'Cambios sin guardar' : 'Todo guardado') + '</span>' +
            '<button type="button" class="ad-btn ad-btn-solid" data-act="save"' + (st.dirty && !st.saving ? '' : ' disabled') + '><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>Guardar</button>' +
            '<button type="button" class="ad-btn" data-act="logout" aria-label="Cerrar sesión"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>Salir</span></button>';
    }
    function renderSide() {
        var el = root.querySelector('.ad-side');
        if (!el) return;
        el.innerHTML = '<p class="ad-side-title">Alojamientos</p>' + st.data.properties.map(function (p, i) {
            return '<button type="button" class="ad-side-item' + (st.view === i ? ' is-active' : '') + '" data-act="view" data-v="' + i + '"><i class="fa-solid fa-house" aria-hidden="true"></i><span>' +
                esc((p.name.es || 'Sin nombre').split(' | ')[0]) + '</span>' + (p.hidden ? '<small>Oculto</small>' : '') + '</button>';
        }).join('') +
            '<button type="button" class="ad-side-item" data-act="add-prop"><i class="fa-solid fa-plus" aria-hidden="true"></i><span>Añadir alojamiento</span></button>' +
            '<p class="ad-side-title">Web</p>' +
            '<button type="button" class="ad-side-item' + (st.view === 'settings' ? ' is-active' : '') + '" data-act="view" data-v="settings"><i class="fa-solid fa-gear" aria-hidden="true"></i><span>Ajustes generales</span></button>';
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

    // ── Eventos ──
    root.addEventListener('input', function (e) {
        var el = e.target, path = el.getAttribute('data-path');
        if (!path || !st.data) return;
        var kind = el.getAttribute('data-kind'), v = el.value;
        if (kind === 'check') v = el.checked;
        else if (kind === 'number' || kind === 'selectnum') v = Number(v) || 0;
        else if (kind === 'lines') v = v.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
        else if (kind === 'md') {
            var m = /^(\d{1,2})\s*[\/-]\s*(\d{1,2})$/.exec(v.trim());
            var ok = m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12;
            el.classList.toggle('is-bad', !ok);
            if (!ok) return;
            v = pad(m[2]) + '-' + pad(m[1]);
        }
        set(path, v);
        var preview = el.parentNode.className === 'ad-icon-field' && el.parentNode.querySelector('i');
        if (preview) preview.className = iconClass(v);
        touch();
    });

    root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b || b.disabled || !st.data) return;
        var act = b.getAttribute('data-act'), p = current();
        var items = b.hasAttribute('data-list') ? get(b.getAttribute('data-list')) : null;
        var i = +b.getAttribute('data-i');
        var syncCover = function () { if (p) p.image = p.gallery[0] || ''; };

        if (act === 'save') return save();
        if (act === 'logout') {
            if (st.dirty && !confirm('Hay cambios sin guardar que se perderán. ¿Salir de todos modos?')) return;
            st.dirty = false;
            return api('POST', { action: 'logout' }).then(function () { st.data = null; renderLogin(load); });
        }
        if (act === 'view') {
            var v = b.getAttribute('data-v');
            st.view = v === 'settings' ? v : +v;
            st.pick = st.month = null;
            renderSide();
            return renderMain();
        }
        if (act === 'tab') { st.tab = b.getAttribute('data-t'); st.pick = null; return renderMain(); }
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
            st.tab = 'general';
            touch();
            renderMain();
            return toast('Alojamiento creado y oculto: complételo y desmarque «Ocultar» cuando esté listo.');
        }
        if (act === 'del-prop') {
            if (!confirm('¿Eliminar «' + (p.name.es || p.id) + '» con todos sus datos? Se aplicará al pulsar Guardar.')) return;
            st.data.properties.splice(st.view, 1);
            st.view = st.data.properties.length ? 0 : 'settings';
        } else if (act === 'add') {
            items.push(NEW[b.getAttribute('data-new')]());
        } else if (act === 'del') {
            items.splice(i, 1);
            syncCover();
        } else if (act === 'move') {
            var j = i + (+b.getAttribute('data-d'));
            items.splice(j, 0, items.splice(i, 1)[0]);
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
        } else if (act === 'nav') {
            st.month = addMonths(st.month || today.slice(0, 8) + '01', +b.getAttribute('data-step'));
            return renderMain();
        } else if (act === 'day') {
            var d = b.getAttribute('data-date');
            if (!st.pick) { st.pick = d; return renderMain(); }
            var from = d < st.pick ? d : st.pick, to = d < st.pick ? st.pick : d;
            p.blocked.push({ start: from, end: addDays(to, 1), note: '' });
            p.blocked.sort(function (x, y) { return x.start < y.start ? -1 : 1; });
            st.pick = null;
        } else return;
        touch();
        renderMain();
    });

    load();
})();
