// Página de Propiedades: fichas, panel de contacto y calendario de disponibilidad.
(function () {
    var cfg = window.VELLUM_PROPERTIES;
    var listRoot = document.getElementById('prop-list');
    var detailRoot = document.getElementById('prop-detail');
    if (!cfg || (!listRoot && !detailRoot)) return;

    var lang = (document.documentElement.lang || '').indexOf('en') === 0 ? 'en' : 'es';
    var T = {
        es: {
            demo: 'Página en preparación: las fechas ocupadas del calendario son de ejemplo.',
            guests: 'huéspedes', bedrooms: 'dormitorios', bathrooms: 'baños',
            photos: 'Ver las {n} fotos', closePhotos: 'Cerrar', prevPhoto: 'Foto anterior', nextPhoto: 'Foto siguiente',
            priceAsk: 'Precio a consultar', checkIn: 'Llegada a partir de las {t}', checkOut: 'Salida antes de las {t}',
            toilet: 'aseo', toilets: 'aseos', minNightsLabel: 'Estancia mínima de {n} noches', cleaningFee: 'de limpieza por estancia',
            back: 'Todas las propiedades', about: 'La casa', included: 'Qué incluye', rulesTitle: 'Normas de la casa',
            locationTitle: 'Ubicación', mapLink: 'Abrir en Google Maps', maxGuests: 'Máximo {n} huéspedes',
            availability: 'Disponibilidad y precio', notFound: 'No hemos encontrado esta propiedad.',
            gridView: 'Vista en cuadrícula', listView: 'Vista en lista', count1: '1 propiedad', countN: '{n} propiedades',
            tabInfo: 'Información', tabRates: 'Tarifas', tabPets: 'Mascotas', tabContact: 'Contacto',
            entry: 'Hora de entrada', exit: 'Hora de salida', perNight: 'por noche', highlightsTitle: 'De un vistazo',
            loadMap: 'Mostrar mapa', mapTitle: 'Mapa de la ubicación', thumbsLabel: 'Todas las fotos',
            mapNote: 'El mapa es de Google Maps: al mostrarlo, Google puede usar cookies.', license: 'Nº de registro',
            reviewsTitle: 'Opiniones de huéspedes', review1: '1 opinión', reviewN: '{n} opiniones', noComment: 'Valoración sin comentario.',
            totalFrom: 'Precio total desde', approxNote: 'Precio orientativo: puede variar según la temporada. Se lo confirmamos al contactar.',
            from: 'Desde', night: 'noche', nights: 'noches',
            check: 'Consultar disponibilidad', info: 'Más información',
            contactTitle: 'Contacto directo', platformsTitle: 'También disponible en',
            call: 'Llamar', email: 'Email', whatsapp: 'WhatsApp',
            copyPhone: 'Copiar el teléfono', copyEmail: 'Copiar el correo', copied: 'Copiado',
            loading: 'Consultando el calendario…',
            unverified: 'Ahora mismo no podemos consultar el calendario en línea. Elija sus fechas y le confirmamos la disponibilidad por teléfono o email.',
            pickIn: 'Seleccione la fecha de entrada.', pickOut: 'Seleccione la fecha de salida.',
            minStay: 'La estancia mínima en esta propiedad es de {n} noches.',
            available: 'Disponible', toConfirm: 'Disponibilidad por confirmar',
            total: 'Precio total', cleaning: 'incluye limpieza',
            confirmNote: 'Su reserva no queda hecha en esta página: contáctenos y se la confirmamos a la mayor brevedad.',
            bookDirect: 'Reservar directamente', bookPlatform: 'O reserve en su plataforma habitual',
            clear: 'Borrar selección', noRoom: 'Desde este día no quedan {n} noches libres seguidas. Elija otra fecha de entrada.', prev: 'Mes anterior', next: 'Mes siguiente',
            legendFree: 'Libre', legendBusy: 'Ocupado', legendSel: 'Su selección',
            days: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
            msg: 'Hola, me interesa {name} del {in} al {out} ({n} noches). ¿Me confirman disponibilidad?',
            subject: 'Reserva {name}: {in} - {out}', subjectInfo: 'Información sobre {name}'
        },
        en: {
            demo: 'Page in preparation: the booked dates shown in the calendar are samples.',
            guests: 'guests', bedrooms: 'bedrooms', bathrooms: 'bathrooms',
            photos: 'View all {n} photos', closePhotos: 'Close', prevPhoto: 'Previous photo', nextPhoto: 'Next photo',
            priceAsk: 'Price on request', checkIn: 'Check-in from {t}', checkOut: 'Check-out before {t}',
            toilet: 'toilet', toilets: 'toilets', minNightsLabel: 'Minimum stay of {n} nights', cleaningFee: 'cleaning fee per stay',
            back: 'All properties', about: 'The house', included: 'What is included', rulesTitle: 'House rules',
            locationTitle: 'Location', mapLink: 'Open in Google Maps', maxGuests: 'Maximum {n} guests',
            availability: 'Availability and price', notFound: 'We could not find this property.',
            gridView: 'Grid view', listView: 'List view', count1: '1 property', countN: '{n} properties',
            tabInfo: 'Information', tabRates: 'Rates', tabPets: 'Pets', tabContact: 'Contact',
            entry: 'Check-in time', exit: 'Check-out time', perNight: 'per night', highlightsTitle: 'At a glance',
            loadMap: 'Show map', mapTitle: 'Location map', thumbsLabel: 'All photos',
            mapNote: 'The map is provided by Google Maps: showing it may let Google use cookies.', license: 'Registration no.',
            reviewsTitle: 'Guest reviews', review1: '1 review', reviewN: '{n} reviews', noComment: 'Rating without a comment.',
            totalFrom: 'Total price from', approxNote: 'Guide price: it may vary depending on the season. We will confirm it when you contact us.',
            from: 'From', night: 'night', nights: 'nights',
            check: 'Check availability', info: 'More information',
            contactTitle: 'Direct contact', platformsTitle: 'Also available on',
            call: 'Call', email: 'Email', whatsapp: 'WhatsApp',
            copyPhone: 'Copy the phone number', copyEmail: 'Copy the email address', copied: 'Copied',
            loading: 'Checking the calendar…',
            unverified: 'We cannot check the calendar online right now. Choose your dates and we will confirm availability by phone or email.',
            pickIn: 'Select your check-in date.', pickOut: 'Select your check-out date.',
            minStay: 'The minimum stay at this property is {n} nights.',
            available: 'Available', toConfirm: 'Availability to be confirmed',
            total: 'Total price', cleaning: 'cleaning included',
            confirmNote: 'Your booking is not made on this page: contact us and we will confirm it as soon as possible.',
            bookDirect: 'Book direct', bookPlatform: 'Or book on your usual platform',
            clear: 'Clear selection', noRoom: 'There are not {n} free nights in a row from this day. Please choose another check-in date.', prev: 'Previous month', next: 'Next month',
            legendFree: 'Free', legendBusy: 'Booked', legendSel: 'Your selection',
            days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
            msg: 'Hello, I am interested in {name} from {in} to {out} ({n} nights). Could you confirm availability?',
            subject: 'Booking {name}: {in} - {out}', subjectInfo: 'Information about {name}'
        }
    }[lang];

    var DAY = 86400000;
    var MAX_MONTHS = 18;
    var now = new Date();
    var today = iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));

    function iso(d) { return d.toISOString().slice(0, 10); }
    function date(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])); }
    function addDays(s, n) { return iso(new Date(date(s).getTime() + n * DAY)); }
    function addMonths(s, n) { var d = date(s); return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))); }
    function diff(a, b) { return Math.round((date(b) - date(a)) / DAY); }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function fill(s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k]; }); }
    function money(n) { return new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); }
    function human(s) { return date(s).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    function monthName(s) { var m = date(s).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }); return m.charAt(0).toUpperCase() + m.slice(1); }

    function hasPrice(p) { return !!(p.price && p.price.base > 0); }
    function nightPrice(p, d) {
        var md = d.slice(5);
        var seasons = p.price.seasons || [];
        for (var i = 0; i < seasons.length; i++) {
            var s = seasons[i];
            var inside = s.from <= s.to ? (md >= s.from && md <= s.to) : (md >= s.from || md <= s.to);
            if (inside) return s.price;
        }
        return p.price.base;
    }
    function stayPrice(p, a, b) {
        var total = p.price.cleaningFee || 0;
        for (var d = a; d < b; d = addDays(d, 1)) total += nightPrice(p, d);
        return total;
    }
    function lowestPrice(p) {
        return (p.price.seasons || []).reduce(function (m, s) { return Math.min(m, s.price); }, p.price.base);
    }
    function busySet(ranges) {
        var set = {};
        var limit = addMonths(today, MAX_MONTHS + 2);
        ranges.forEach(function (r) {
            for (var d = r.start < today ? today : r.start; d < r.end && d < limit; d = addDays(d, 1)) set[d] = true;
        });
        return set;
    }

    function copyButton(value, label) {
        return '<button type="button" class="prop-btn prop-copy" data-copy="' + esc(value) + '" data-done="' + T.copied + '" aria-label="' + label + '" title="' + label + '"><i class="fa-regular fa-copy" aria-hidden="true"></i></button>';
    }
    function contactButtons(p, range, short) {
        var c = cfg.contact, name = p.name[lang];
        var v = range ? { name: name, in: human(range.a), out: human(range.b), n: diff(range.a, range.b) } : null;
        var text = v ? fill(T.msg, v) : fill(T.subjectInfo, { name: name });
        var subject = v ? fill(T.subject, v) : fill(T.subjectInfo, { name: name });
        return '<div class="prop-buttons">' +
            '<span class="prop-copy-group is-phone"><a class="prop-btn prop-btn-solid" href="tel:' + esc(c.tel) + '"><i class="fa-solid fa-phone" aria-hidden="true"></i>' + esc(c.phone) + '</a>' + copyButton(c.phone, T.copyPhone) + '</span>' +
            '<span class="prop-copy-group"><a class="prop-btn" href="mailto:' + esc(c.email) + '?subject=' + encodeURIComponent(subject) + (v ? '&body=' + encodeURIComponent(text) : '') + '"><i class="fa-solid fa-envelope" aria-hidden="true"></i>' + (short ? T.email : esc(c.email)) + '</a>' + copyButton(c.email, T.copyEmail) + '</span>' +
            '<a class="prop-btn" target="_blank" rel="noopener noreferrer" href="https://wa.me/' + esc(c.whatsapp) + '?text=' + encodeURIComponent(text) + '"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i>' + T.whatsapp + '</a>' +
            '</div>';
    }
    // Distintivo de cada plataforma con sus colores (Airbnb usa el icono de Font Awesome)
    var LOGOS = {
        airbnb: '<span class="prop-logo" style="background:#FF5A5F"><i class="fa-brands fa-airbnb" aria-hidden="true"></i></span>',
        booking: '<span class="prop-logo" style="background:#003580"><svg viewBox="0 0 24 24" aria-hidden="true"><text x="5.2" y="17.6" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#fff">B</text><circle cx="18.3" cy="16.2" r="1.7" fill="#009FE3"/></svg></span>',
        vrbo: '<span class="prop-logo" style="background:#0E214B"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 6.5h3.4l3.1 8.1 3.1-8.1h3.4L13.7 18h-3.4z" fill="#fff"/></svg></span>'
    };
    function platformButtons(p) {
        var names = { airbnb: 'Airbnb', vrbo: 'Vrbo', booking: 'Booking.com' };
        var html = Object.keys(names).filter(function (k) { return p.links && p.links[k]; }).map(function (k) {
            return '<a class="prop-btn prop-btn-ghost" target="_blank" rel="noopener noreferrer" href="' + esc(p.links[k]) + '">' + LOGOS[k] + '<span>' + names[k] + '</span><i class="fa-solid fa-arrow-up-right-from-square prop-ext" aria-hidden="true"></i></a>';
        }).join('');
        return html ? '<div class="prop-buttons prop-platforms">' + html + '</div>' : '';
    }
    // Copiar al portapapeles (con alternativa para navegadores sin acceso directo)
    document.addEventListener('click', function (e) {
        var b = e.target.closest('.prop-copy');
        if (!b) return;
        var value = b.getAttribute('data-copy');
        var done = function () {
            b.classList.add('is-copied');
            b.querySelector('i').className = 'fa-solid fa-check';
            clearTimeout(b._t);
            b._t = setTimeout(function () { b.classList.remove('is-copied'); b.querySelector('i').className = 'fa-regular fa-copy'; }, 1800);
        };
        var fallback = function () {
            var ta = document.createElement('textarea');
            ta.value = value; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
            document.body.appendChild(ta); ta.select();
            try { if (document.execCommand('copy')) done(); } catch (err) { }
            document.body.removeChild(ta);
            b.focus();
        };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(done, fallback);
        else fallback();
    });

    function calendar(p, panel) {
        var st = { month: today.slice(0, 8) + '01', a: null, b: null, busy: null, verified: false };
        var firstMonth = st.month;
        var note = panel.querySelector('.prop-cal-note');
        var months = panel.querySelector('.prop-cal-months');
        var result = panel.querySelector('.prop-result');
        var min = (p.price && p.price.minNights) || p.minNights || 1;
        var minBox = function () { return min > 1 ? '<p class="prop-min' + (st.flash ? ' is-flash' : '') + '"><i class="fa-solid fa-moon" aria-hidden="true"></i>' + fill(T.minNightsLabel, { n: min }) + '</p>' : ''; };
        var clearBtn = '<button type="button" class="prop-clear"><i class="fa-solid fa-xmark" aria-hidden="true"></i>' + T.clear + '</button>';

        // Con entrada elegida: último día válido de salida (el primer día cuya noche está ocupada).
        function limitAfter(a) {
            var d = addDays(a, 1);
            for (var i = 0; i < 366 && !st.busy[d]; i++) d = addDays(d, 1);
            return d;
        }
        function selectable(d) {
            if (d < today) return false;
            if (st.a && !st.b && d > st.a) return d <= limitAfter(st.a);
            return !st.busy[d];
        }
        function pick(d) {
            if (d === st.a) { st.a = st.b = null; }                                  // pulsar de nuevo la entrada borra la selección
            else if (!st.a || st.b || d < st.a) { st.a = d; st.b = null; }
            else if (diff(st.a, d) < min) { st.flash = true; }                      // menos noches que el mínimo: no se acepta
            else { st.b = d; }
            draw();
            st.flash = false;
        }

        function monthHtml(first) {
            var d0 = date(first);
            var offset = (d0.getUTCDay() + 6) % 7;
            var count = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 0)).getUTCDate();
            var html = '<div class="prop-month"><p class="prop-month-name">' + esc(monthName(first)) + '</p><div class="prop-days">';
            T.days.forEach(function (n) { html += '<span class="prop-dow">' + n + '</span>'; });
            for (var i = 0; i < offset; i++) html += '<span></span>';
            var minEnd = st.a && !st.b ? addDays(st.a, min) : '';
            for (var n = 1; n <= count; n++) {
                var d = first.slice(0, 8) + (n < 10 ? '0' + n : n);
                var ok = selectable(d);
                var short = ok && minEnd && d > st.a && d < minEnd;
                var cls = 'prop-day';
                if (short) cls += ' is-short';
                if (d < today) cls += ' is-past';
                else if (st.busy[d] && !ok && d !== st.b) cls += ' is-busy';
                if (d === st.a) cls += ' is-start';
                if (d === st.b) cls += ' is-end';
                if (st.a && st.b && d > st.a && d < st.b) cls += ' is-range';
                html += '<button type="button" class="' + cls + '" data-date="' + d + '"' + (ok ? '' : ' disabled') + (short ? ' aria-disabled="true" title="' + esc(fill(T.minStay, { n: min })) + '"' : '') + ' aria-label="' + esc(human(d)) + '">' + n + '</button>';
            }
            return html + '</div></div>';
        }

        function resultHtml() {
            if (!st.a) return '<p class="prop-hint">' + T.pickIn + '</p>' + minBox();
            if (!st.b) return '<p class="prop-hint"><strong>' + esc(human(st.a)) + '</strong> → ' + T.pickOut + '</p>' +
                (limitAfter(st.a) < addDays(st.a, min) ? '<p class="prop-warn">' + fill(T.noRoom, { n: min }) + '</p>' : minBox()) + clearBtn;
            var n = diff(st.a, st.b);
            var head = '<p class="prop-dates"><strong>' + esc(human(st.a)) + '</strong> → <strong>' + esc(human(st.b)) + '</strong> · ' + n + ' ' + (n === 1 ? T.night : T.nights) + '</p>' + clearBtn;
            if (n < min) return head + '<p class="prop-warn">' + fill(T.minStay, { n: min }) + '</p>';
            var range = { a: st.a, b: st.b };
            return head +
                '<p class="prop-status ' + (st.verified ? 'is-ok' : 'is-pending') + '"><i class="fa-solid ' + (st.verified ? 'fa-circle-check' : 'fa-circle-question') + '" aria-hidden="true"></i>' + (st.verified ? T.available : T.toConfirm) + '</p>' +
                (hasPrice(p)
                    ? '<p class="prop-total">' + (p.price.approx ? T.totalFrom : T.total) + ': <strong>' + money(stayPrice(p, st.a, st.b)) + '</strong>' + (p.price.cleaningFee ? ' <span>(' + T.cleaning + ')</span>' : '') + '</p>'
                    : '<p class="prop-total">' + T.priceAsk + '</p>') +
                contactButtons(p, range, true) +
                '<p class="prop-small">' + T.confirmNote + '</p>' +
                (platformButtons(p) ? '<p class="prop-sub">' + T.bookPlatform + '</p>' + platformButtons(p) : '');
        }

        function draw() {
            if (!st.busy) { note.textContent = T.loading; note.hidden = false; return; }
            note.textContent = st.verified ? '' : T.unverified;
            note.hidden = st.verified;
            note.classList.toggle('is-alert', !st.verified);
            months.innerHTML =
                '<div class="prop-cal-nav">' +
                '<button type="button" class="prop-nav" data-step="-1" aria-label="' + T.prev + '"' + (st.month <= firstMonth ? ' disabled' : '') + '><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>' +
                '<button type="button" class="prop-nav" data-step="1" aria-label="' + T.next + '"' + (st.month >= addMonths(firstMonth, MAX_MONTHS) ? ' disabled' : '') + '><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>' +
                '</div><div class="prop-months-grid">' + monthHtml(st.month) + monthHtml(addMonths(st.month, 1)) + '</div>' +
                '<p class="prop-legend"><span class="lg lg-free"></span>' + T.legendFree + '<span class="lg lg-busy"></span>' + T.legendBusy + '<span class="lg lg-sel"></span>' + T.legendSel + '</p>';
            result.innerHTML = resultHtml();
        }

        panel.addEventListener('click', function (e) {
            var day = e.target.closest('.prop-day');
            var nav = e.target.closest('.prop-nav');
            if (day && !day.disabled) pick(day.getAttribute('data-date'));
            else if (nav && !nav.disabled) { st.month = addMonths(st.month, +nav.getAttribute('data-step')); draw(); }
            else if (e.target.closest('.prop-clear')) { st.a = st.b = null; draw(); }
        });

        function loaded(ranges, verified) { st.busy = busySet(ranges); st.verified = verified; draw(); }
        draw();
        if (cfg.demo) {
            loaded((p.demoBusy || []).map(function (r) { return { start: addDays(today, r[0]), end: addDays(today, r[1]) }; }), true);
        } else {
            // "rev" cambia cada vez que se guarda en el panel: así no se sirve un calendario antiguo
            fetch('/api/availability?property=' + encodeURIComponent(p.id) + (cfg.rev ? '&v=' + cfg.rev : ''))
                .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
                .then(function (d) { if (!d.complete) throw new Error(); loaded(d.busy, true); })
                .catch(function () { loaded([], false); });
        }
    }

    // Galería a pantalla completa con tira de miniaturas para saltar a cualquier foto
    var box = null, boxPhotos = [], boxIndex = 0, boxAlt = '';
    function showPhoto(i) {
        boxIndex = (i + boxPhotos.length) % boxPhotos.length;
        var img = box.querySelector('.prop-lb-img');
        img.src = boxPhotos[boxIndex];
        img.alt = boxAlt + ' (' + (boxIndex + 1) + '/' + boxPhotos.length + ')';
        box.querySelector('.prop-lb-count').textContent = (boxIndex + 1) + ' / ' + boxPhotos.length;
        var strip = box.querySelector('.prop-lb-strip');
        strip.querySelectorAll('.prop-lb-thumb').forEach(function (t, k) {
            t.classList.toggle('is-active', k === boxIndex);
            if (k === boxIndex) {
                t.setAttribute('aria-current', 'true');
                strip.scrollTo({ left: t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
            } else t.removeAttribute('aria-current');
        });
        new Image().src = boxPhotos[(boxIndex + 1) % boxPhotos.length];
    }
    function closeGallery() { box.hidden = true; document.documentElement.style.overflow = ''; }
    function openGallery(photos, alt, i, small) {
        if (!box) {
            box = document.createElement('div');
            box.className = 'prop-lightbox';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            box.innerHTML =
                '<p class="prop-lb-count" aria-live="polite"></p>' +
                '<button type="button" class="prop-lb-btn prop-lb-close" aria-label="' + T.closePhotos + '"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
                '<div class="prop-lb-stage">' +
                '<button type="button" class="prop-lb-btn prop-lb-prev" aria-label="' + T.prevPhoto + '"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>' +
                '<img class="prop-lb-img" alt="">' +
                '<button type="button" class="prop-lb-btn prop-lb-next" aria-label="' + T.nextPhoto + '"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>' +
                '</div><div class="prop-lb-strip" aria-label="' + T.thumbsLabel + '"></div>';
            document.body.appendChild(box);
            var startX = null;
            box.addEventListener('click', function (e) {
                var thumb = e.target.closest('.prop-lb-thumb');
                if (thumb) showPhoto(+thumb.getAttribute('data-i'));
                else if (e.target.closest('.prop-lb-prev')) showPhoto(boxIndex - 1);
                else if (e.target.closest('.prop-lb-next')) showPhoto(boxIndex + 1);
                else if (!e.target.closest('.prop-lb-img, .prop-lb-strip')) closeGallery();
            });
            var stage = box.querySelector('.prop-lb-stage');
            stage.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
            stage.addEventListener('touchend', function (e) {
                if (startX === null) return;
                var dx = e.changedTouches[0].clientX - startX;
                startX = null;
                if (Math.abs(dx) > 40) showPhoto(boxIndex + (dx < 0 ? 1 : -1));
            });
            document.addEventListener('keydown', function (e) {
                if (box.hidden) return;
                if (e.key === 'Escape') closeGallery();
                else if (e.key === 'ArrowLeft') showPhoto(boxIndex - 1);
                else if (e.key === 'ArrowRight') showPhoto(boxIndex + 1);
            });
        }
        boxPhotos = photos; boxAlt = alt;
        box.querySelector('.prop-lb-strip').innerHTML = photos.map(function (src, k) {
            return '<button type="button" class="prop-lb-thumb" data-i="' + k + '" aria-label="' + (k + 1) + ' / ' + photos.length + '"><img src="' + esc((small || photos)[k]) + '" alt="" loading="lazy"></button>';
        }).join('');
        box.hidden = false;
        document.documentElement.style.overflow = 'hidden';
        showPhoto(i);
        box.querySelector('.prop-lb-close').focus();
    }

    function factsHtml(p) {
        return '<ul class="prop-facts">' +
            '<li><i class="fa-solid fa-user-group" aria-hidden="true"></i>' + p.guests + ' ' + T.guests + '</li>' +
            (p.bedrooms ? '<li><i class="fa-solid fa-bed" aria-hidden="true"></i>' + p.bedrooms + ' ' + T.bedrooms + '</li>' : '') +
            (p.bathrooms ? '<li><i class="fa-solid fa-bath" aria-hidden="true"></i>' + p.bathrooms + ' ' + T.bathrooms + '</li>' : '') +
            (p.toilets ? '<li><i class="fa-solid fa-toilet" aria-hidden="true"></i>' + p.toilets + ' ' + (p.toilets === 1 ? T.toilet : T.toilets) + '</li>' : '') + '</ul>';
    }
    function priceHtml(p, withCleaning) {
        if (!hasPrice(p)) return '<p class="prop-price">' + T.priceAsk + '</p>';
        return '<p class="prop-price">' + T.from + ' <strong>' + money(lowestPrice(p)) + '</strong> / ' + T.night +
            (withCleaning && p.price.cleaningFee ? ' <span>+ ' + money(p.price.cleaningFee) + ' ' + T.cleaningFee + '</span>' : '') + '</p>';
    }
    function detailUrl(p) {
        return (lang === 'en' ? 'property.html' : 'propiedad.html') + '?casa=' + encodeURIComponent(p.slug || p.id);
    }
    function store(key, value) {
        try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch (e) { }
        return null;
    }

    // ── Listado: fichas resumidas, en cuadrícula o en lista ──
    function summaryCard(p) {
        var url = esc(detailUrl(p));
        var el = document.createElement('article');
        el.className = 'prop-item';
        el.innerHTML =
            '<a class="prop-item-media" href="' + url + '" tabindex="-1" aria-hidden="true"><img src="' + esc(p.image) + '" alt="" loading="lazy" width="800" height="533">' +
            (p.location && p.location[lang] ? '<span class="prop-badge">' + esc(p.location[lang]) + '</span>' : '') + '</a>' +
            '<div class="prop-item-body">' +
            '<h2 class="prop-item-title"><a href="' + url + '">' + esc(p.name[lang]) + '</a></h2>' +
            factsHtml(p) +
            (p.summary && p.summary[lang] ? '<p class="prop-item-text">' + esc(p.summary[lang]) + '</p>' : '') +
            priceHtml(p, false) +
            '<a class="prop-more" href="' + url + '">' + T.info + ' <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>' +
            '</div>';
        return el;
    }
    function initList() {
        var n = cfg.properties.length;
        var toolbar = document.getElementById('prop-toolbar');
        if (toolbar) {
            toolbar.className = 'prop-toolbar';
            toolbar.innerHTML = '<p class="prop-count">' + (n === 1 ? T.count1 : fill(T.countN, { n: n })) + '</p>' +
                '<div class="prop-view">' +
                '<button type="button" class="prop-view-btn" data-view="grid" aria-label="' + T.gridView + '"><i class="fa-solid fa-table-cells-large" aria-hidden="true"></i></button>' +
                '<button type="button" class="prop-view-btn" data-view="list" aria-label="' + T.listView + '"><i class="fa-solid fa-list" aria-hidden="true"></i></button></div>';
            var setView = function (v) {
                listRoot.classList.toggle('is-list', v === 'list');
                toolbar.querySelectorAll('.prop-view-btn').forEach(function (b) {
                    var on = b.getAttribute('data-view') === v;
                    b.classList.toggle('is-active', on);
                    b.setAttribute('aria-pressed', String(on));
                });
            };
            toolbar.addEventListener('click', function (e) {
                var b = e.target.closest('.prop-view-btn');
                if (b) { store('prop-view', b.getAttribute('data-view')); setView(b.getAttribute('data-view')); }
            });
            setView(store('prop-view') === 'list' ? 'list' : 'grid');
        }
        cfg.properties.forEach(function (p) { listRoot.appendChild(summaryCard(p)); });
    }

    // ── Detalle: página completa de una propiedad ──
    function initDetail() {
        var wanted = new URLSearchParams(location.search).get('casa');
        var p = cfg.properties.filter(function (x) { return x.slug === wanted || x.id === wanted; })[0];
        if (!p && !wanted && cfg.properties.length === 1) p = cfg.properties[0];
        var listUrl = lang === 'en' ? 'properties.html' : 'propiedades.html';
        var back = '<a class="prop-back" href="' + listUrl + '"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i>' + T.back + '</a>';
        if (!p) {
            detailRoot.innerHTML = back + '<h1 class="prop-name">' + T.notFound + '</h1>';
            return;
        }
        var full = p.name[lang], parts = full.split(' | ');
        document.title = full + ' | Vellum Costa';
        var meta = document.querySelector('meta[name="description"]');
        if (meta && p.summary) meta.setAttribute('content', p.summary[lang]);
        // El selector de idioma debe llevar a esta misma propiedad
        document.querySelectorAll('a[href="propiedad.html"], a[href="property.html"]').forEach(function (el) {
            el.setAttribute('href', el.getAttribute('href') + '?casa=' + encodeURIComponent(p.slug || p.id));
        });
        var icon = function (name) { return '<i class="' + (name.indexOf('fa-regular') === 0 ? '' : 'fa-solid ') + esc(name) + '" aria-hidden="true"></i>'; };
        var place = (p.location && p.location[lang] ? p.location[lang] : '') + (p.province ? ', ' + p.province : '');

        // Foto principal + cuatro miniaturas repartidas por la galería (distintas zonas de la casa)
        var photos = p.gallery && p.gallery.length ? p.gallery : [p.image];
        var small = p.thumbs ? photos.map(function (s) { return s.replace(/([^\/]+)$/, 'thumbs/$1'); }) : photos;
        var thumbs = photos.length < 5 ? [] : [1, 2, 3, 4].map(function (k) { return Math.floor(k * photos.length / 5); });
        var hero = '<div class="prop-hero">' +
            '<button type="button" class="prop-hero-main" data-i="0"><img src="' + esc(photos[0]) + '" alt="' + esc(p.imageAlt[lang]) + '" fetchpriority="high">' +
            (photos.length > 1 ? '<span class="prop-photos">' + icon('fa-regular fa-images') + fill(T.photos, { n: photos.length }) + '</span>' : '') + '</button>' +
            (thumbs.length ? '<div class="prop-thumbs">' + thumbs.map(function (i) {
                return '<button type="button" class="prop-thumb" data-i="' + i + '"><img src="' + esc(photos[i]) + '" alt="' + esc(full + ' (' + (i + 1) + ')') + '" loading="lazy"></button>';
            }).join('') + '</div>' : '') + '</div>';

        var side = '<aside class="prop-side"><div class="prop-side-inner">' +
            '<div class="prop-head"><h1 class="prop-name">' + esc(parts[0]) + '</h1>' +
            (parts.length > 1 ? '<p class="prop-tagline">' + esc(parts.slice(1).join(' | ')) + '</p>' : '') +
            '<p class="prop-loc">' + (place ? '<span>' + icon('fa-location-dot') + esc(place) + '</span>' : '') +
            (p.license ? '<span class="prop-license" title="' + T.license + '">' + esc(p.license) + '</span>' : '') + '</p></div>' +
            '<div class="prop-side-card">' + priceHtml(p, true) +
            (cfg.demo ? '<p class="prop-demo">' + T.demo + '</p>' : '') + '<p class="prop-cal-note" aria-live="polite"></p>' +
            '<div class="prop-cal"><div class="prop-cal-months"></div><div class="prop-result" aria-live="polite"></div></div></div>' +
            '</div></aside>';

        // Datos clave en recuadros
        var tiles = [['fa-user-group', p.guests, T.guests]];
        if (p.bedrooms) tiles.push(['fa-bed', p.bedrooms, T.bedrooms]);
        if (p.bathrooms) tiles.push(['fa-bath', p.bathrooms, T.bathrooms]);
        if (p.toilets) tiles.push(['fa-toilet', p.toilets, p.toilets === 1 ? T.toilet : T.toilets]);
        (p.highlights || []).forEach(function (h) { tiles.push([h.icon, '', h[lang]]); });
        var tilesHtml = '<div class="prop-tiles" aria-label="' + T.highlightsTitle + '">' + tiles.map(function (t) {
            return '<div class="prop-tile"><p class="prop-tile-top">' + icon(t[0]) + (t[1] !== '' ? '<strong>' + t[1] + '</strong>' : '') + '</p><p class="prop-tile-label">' + esc(t[2]) + '</p></div>';
        }).join('') + '</div>';

        // Información, tarifas, mascotas y contacto: todo a la vista en un solo bloque
        var check = function (text) { return '<li>' + icon('fa-check') + esc(text) + '</li>'; };
        var block = function (title, ico, html, wide) { return '<div class="prop-info-block' + (wide ? ' is-wide' : '') + '"><h3>' + icon(ico) + esc(title) + '</h3>' + html + '</div>'; };
        var info = [];
        if (p.checkIn) info.push(T.entry + ': ' + p.checkIn);
        if (p.checkOut) info.push(T.exit + ': ' + p.checkOut);
        info.push(fill(T.maxGuests, { n: p.guests }));
        var infoHtml = block(T.tabInfo, 'fa-circle-info', '<ul class="prop-rule-list">' + info.map(check).join('') + '</ul>');
        if (hasPrice(p)) {
            var rates = [T.from + ' ' + money(lowestPrice(p)) + ' ' + T.perNight];
            if (p.price.cleaningFee) rates.push(money(p.price.cleaningFee) + ' ' + T.cleaningFee);
            if (p.price.minNights > 1) rates.push(fill(T.minNightsLabel, { n: p.price.minNights }));
            infoHtml += block(T.tabRates, 'fa-tags', '<ul class="prop-rule-list">' + rates.map(check).join('') + '</ul>');
        }
        if (p.pets && p.pets[lang]) infoHtml += block(T.tabPets, 'fa-paw', '<ul class="prop-rule-list">' + check(p.pets[lang]) + '</ul>');
        infoHtml += block(T.tabContact, 'fa-phone', '<div class="prop-contact-row">' + contactButtons(p) + platformButtons(p) + '</div>' +
            (hasPrice(p) && p.price.approx ? '<p class="prop-small">' + T.approxNote + '</p>' : ''), true);

        var section = function (title, html) { return '<section class="prop-section"><h2 class="prop-h2">' + title + '</h2>' + html + '</section>'; };
        var amenities = (p.amenities || []).map(function (g) {
            return '<div class="prop-amen-group"><h3>' + icon(g.icon) + esc(g.title[lang]) + '</h3><ul>' +
                g.items[lang].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
        }).join('');
        var mapUrl = p.mapQuery ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.mapQuery) : '';
        var locationHtml = (place ? '<p class="prop-loc-line">' + icon('fa-location-dot') + esc(place) + '</p>' : '') +
            (p.locationText && p.locationText[lang] ? '<p class="prop-desc">' + esc(p.locationText[lang]) + '</p>' : '') +
            (p.mapQuery ? '<div class="prop-map"><button type="button" class="prop-btn prop-map-load">' + icon('fa-map-location-dot') + T.loadMap + '</button><p class="prop-small">' + T.mapNote + '</p></div>' +
                '<a class="prop-more" target="_blank" rel="noopener noreferrer" href="' + esc(mapUrl) + '">' + T.mapLink + ' ' + icon('fa-arrow-up-right-from-square') + '</a>' : '');

        // Opiniones reales de las plataformas (cada una con su propia escala de puntuación)
        var sources = { airbnb: 'Airbnb', booking: 'Booking.com', vrbo: 'Vrbo' };
        var decimal = function (n) { return n.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); };
        var reviews = p.reviews || [], reviewsHtml = '';
        if (reviews.length) {
            var groups = {};
            reviews.forEach(function (r) { (groups[r.source] = groups[r.source] || []).push(r); });
            reviewsHtml = '<div class="prop-scores">' + Object.keys(groups).map(function (k) {
                var g = groups[k], avg = g.reduce(function (s, r) { return s + r.rating; }, 0) / g.length;
                return '<p class="prop-score"><strong>' + decimal(avg) + '</strong><span>/ ' + g[0].max + '</span><em>' + sources[k] + ' · ' + (g.length === 1 ? T.review1 : fill(T.reviewN, { n: g.length })) + '</em></p>';
            }).join('') + '</div><div class="prop-reviews">' + reviews.map(function (r) {
                var score = r.max === 5
                    ? '<span class="prop-stars" role="img" aria-label="' + r.rating + ' / 5">' + new Array(r.rating + 1).join(icon('fa-star')) + '</span>'
                    : '<span class="prop-review-score">' + decimal(r.rating) + ' <small>/ ' + r.max + '</small></span>';
                return '<article class="prop-review"><p class="prop-review-name">' + esc(r.name) + '</p>' +
                    '<p class="prop-review-meta">' + sources[r.source] + ' · ' + esc(r.date[lang]) + '</p>' +
                    '<p class="prop-review-text' + (r.text ? '' : ' is-empty') + '">' + (r.text ? esc(r.text) : T.noComment) + '</p>' +
                    '<p class="prop-review-foot">' + score + '</p></article>';
            }).join('') + '</div>';
        }

        detailRoot.innerHTML = back + '<div class="prop-layout">' + hero + side +
            '<div class="prop-main">' + tilesHtml +
            '<p class="prop-desc prop-lead">' + esc(p.description[lang]) + '</p>' +
            '<div class="prop-info">' + infoHtml + '</div>' +
            (amenities ? section(T.included, '<div class="prop-amen">' + amenities + '</div>') : '') +
            (reviewsHtml ? section(T.reviewsTitle, reviewsHtml) : '') +
            (locationHtml ? section(T.locationTitle, locationHtml) : '') +
            '</div></div>';

        detailRoot.querySelector('.prop-hero').addEventListener('click', function (e) {
            var cell = e.target.closest('[data-i]');
            if (cell && photos.length > 1) openGallery(photos, full, +cell.getAttribute('data-i'), small);
        });
        var mapBox = detailRoot.querySelector('.prop-map');
        if (mapBox) mapBox.querySelector('.prop-map-load').addEventListener('click', function () {
            // El mapa solo se carga cuando el visitante lo pide
            mapBox.classList.add('is-loaded');
            mapBox.innerHTML = '<iframe title="' + T.mapTitle + '" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/maps?q=' + encodeURIComponent(p.mapQuery) + '&z=' + (p.mapZoom || 11) + '&output=embed"></iframe>';
        });
        calendar(p, detailRoot.querySelector('.prop-side-card'));
        var inner = detailRoot.querySelector('.prop-side-inner');
        var stick = function () { inner.style.top = Math.min(96, window.innerHeight - inner.offsetHeight - 16) + 'px'; };
        stick();
        window.addEventListener('resize', stick);
        if (window.ResizeObserver) new ResizeObserver(stick).observe(inner);
    }

    if (listRoot) initList();
    if (detailRoot) initDetail();
})();
