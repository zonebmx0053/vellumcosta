// Catálogo de opciones del panel (/admin): servicios, tipos de alojamiento, normas y
// políticas de cancelación. Lo usan el panel (para pintar los selectores) y el servidor
// (api/_lib.js, para convertir lo elegido en los textos e iconos que muestra la web).
// Para añadir un servicio nuevo basta con añadir una línea S(...) en su categoría.
// Los "id" no deben cambiarse una vez usados: es lo que se guarda en la base de datos.
(function (root) {
    // S(id, icono de Font Awesome, español, inglés, [textos antiguos equivalentes])
    function S(id, icon, es, en, alias) { return { id: id, icon: icon, es: es, en: en, alias: alias || [] }; }

    var categories = [
        { id: 'exterior', icon: 'fa-water-ladder', es: 'Exterior', en: 'Outdoors', items: [
            S('pool-private', 'fa-water-ladder', 'Piscina privada', 'Private pool'),
            S('pool-shared', 'fa-person-swimming', 'Piscina compartida', 'Shared pool'),
            S('pool-heated', 'fa-temperature-arrow-up', 'Piscina climatizada', 'Heated pool'),
            S('jacuzzi', 'fa-hot-tub-person', 'Jacuzzi', 'Hot tub'),
            S('bbq', 'fa-fire-burner', 'Barbacoa', 'Barbecue', ['Zona de barbacoa']),
            S('terrace', 'fa-chair', 'Terraza o porche amueblado', 'Furnished terrace or porch', ['Terraza y porche amueblados', 'Terraza']),
            S('garden', 'fa-tree', 'Jardín', 'Garden'),
            S('balcony', 'fa-door-open', 'Balcón', 'Balcony'),
            S('outdoor-dining', 'fa-utensils', 'Comedor exterior', 'Outdoor dining area'),
            S('sunbeds', 'fa-umbrella-beach', 'Tumbonas', 'Sun loungers'),
            S('view-sea', 'fa-water', 'Vistas al mar', 'Sea views'),
            S('view-mountain', 'fa-mountain-sun', 'Vistas a la montaña', 'Mountain views'),
            S('beach-access', 'fa-umbrella-beach', 'Acceso a la playa', 'Beach access'),
            S('parking', 'fa-square-parking', 'Aparcamiento gratuito', 'Free parking', ['Aparcamiento gratuito en la finca', 'Aparcamiento gratis']),
            S('garage', 'fa-warehouse', 'Garaje', 'Garage'),
            S('ev-charger', 'fa-charging-station', 'Cargador para coche eléctrico', 'EV charger'),
            S('playground', 'fa-child-reaching', 'Zona de juegos infantil', 'Children\'s play area')
        ] },
        { id: 'kitchen', icon: 'fa-utensils', es: 'Cocina y comedor', en: 'Kitchen and dining', items: [
            S('kitchen', 'fa-kitchen-set', 'Cocina equipada', 'Equipped kitchen'),
            S('fridge', 'fa-snowflake', 'Nevera', 'Fridge'),
            S('freezer', 'fa-icicles', 'Congelador', 'Freezer'),
            S('oven', 'fa-fire', 'Horno', 'Oven'),
            S('hob', 'fa-fire-flame-simple', 'Vitrocerámica o fogones', 'Hob'),
            S('microwave', 'fa-wave-square', 'Microondas', 'Microwave'),
            S('dishwasher', 'fa-sink', 'Lavavajillas', 'Dishwasher'),
            S('coffee', 'fa-mug-hot', 'Cafetera', 'Coffee maker'),
            S('kettle', 'fa-mug-saucer', 'Hervidor de agua', 'Kettle'),
            S('toaster', 'fa-bread-slice', 'Tostadora', 'Toaster'),
            S('blender', 'fa-blender', 'Batidora', 'Blender'),
            S('cookware', 'fa-spoon', 'Cazuelas, sartenes y utensilios básicos', 'Pots, pans and basic utensils'),
            S('dishes', 'fa-utensils', 'Vajilla y cubiertos', 'Dishes and cutlery'),
            S('basics', 'fa-pepper-hot', 'Aceite, sal y pimienta', 'Oil, salt and pepper'),
            S('dining-table', 'fa-chair', 'Mesa de comedor', 'Dining table')
        ] },
        { id: 'climate', icon: 'fa-temperature-half', es: 'Calefacción y refrigeración', en: 'Heating and cooling', items: [
            S('ac', 'fa-snowflake', 'Aire acondicionado', 'Air conditioning'),
            S('heating', 'fa-temperature-arrow-up', 'Calefacción', 'Heating'),
            S('fireplace', 'fa-fire', 'Chimenea', 'Fireplace'),
            S('fans', 'fa-fan', 'Ventiladores', 'Fans')
        ] },
        { id: 'bedroom', icon: 'fa-bed', es: 'Dormitorio y lavandería', en: 'Bedroom and laundry', items: [
            S('linen', 'fa-bed', 'Sábanas y toallas', 'Bed linen and towels'),
            S('extra-bedding', 'fa-mattress-pillow', 'Almohadas y mantas extra', 'Extra pillows and blankets'),
            S('wardrobe', 'fa-shirt', 'Armario y perchas', 'Wardrobe and hangers'),
            S('blackout', 'fa-moon', 'Cortinas opacas', 'Blackout curtains'),
            S('washer', 'fa-jug-detergent', 'Lavadora', 'Washing machine'),
            S('dryer', 'fa-wind', 'Secadora', 'Dryer'),
            S('iron', 'fa-shirt', 'Plancha', 'Iron'),
            S('clothesline', 'fa-sun', 'Tendedero', 'Clothes drying rack')
        ] },
        { id: 'bathroom', icon: 'fa-bath', es: 'Baño', en: 'Bathroom', items: [
            S('hot-water', 'fa-faucet-drip', 'Agua caliente', 'Hot water'),
            S('toiletries', 'fa-soap', 'Jabón y papel higiénico', 'Soap and toilet paper'),
            S('shampoo', 'fa-pump-soap', 'Champú y gel', 'Shampoo and shower gel'),
            S('hairdryer', 'fa-wind', 'Secador de pelo', 'Hairdryer'),
            S('shower', 'fa-shower', 'Ducha', 'Shower'),
            S('bathtub', 'fa-bath', 'Bañera', 'Bathtub'),
            S('bidet', 'fa-toilet', 'Bidé', 'Bidet')
        ] },
        { id: 'tech', icon: 'fa-wifi', es: 'Internet y ocio', en: 'Internet and entertainment', items: [
            S('wifi', 'fa-wifi', 'Wifi', 'Wifi'),
            S('tv', 'fa-tv', 'Televisión', 'Television'),
            S('smart-tv', 'fa-tv', 'Smart TV con streaming', 'Smart TV with streaming'),
            S('workspace', 'fa-laptop', 'Zona de trabajo', 'Workspace'),
            S('sound', 'fa-music', 'Equipo de música', 'Sound system'),
            S('console', 'fa-gamepad', 'Videoconsola', 'Games console'),
            S('board-games', 'fa-dice', 'Juegos de mesa', 'Board games'),
            S('books', 'fa-book', 'Libros', 'Books')
        ] },
        { id: 'family', icon: 'fa-children', es: 'Familias y mascotas', en: 'Families and pets', items: [
            S('pets', 'fa-paw', 'Admite mascotas', 'Pets welcome'),
            S('fenced', 'fa-border-all', 'Finca vallada', 'Fenced grounds'),
            S('crib', 'fa-baby-carriage', 'Cuna', 'Cot'),
            S('high-chair', 'fa-baby', 'Trona', 'High chair'),
            S('toys', 'fa-puzzle-piece', 'Juguetes', 'Toys')
        ] },
        { id: 'safety', icon: 'fa-shield-halved', es: 'Seguridad', en: 'Safety', items: [
            S('smoke-alarm', 'fa-bell', 'Detector de humo', 'Smoke alarm'),
            S('co-alarm', 'fa-triangle-exclamation', 'Detector de monóxido de carbono', 'Carbon monoxide alarm'),
            S('extinguisher', 'fa-fire-extinguisher', 'Extintor', 'Fire extinguisher'),
            S('first-aid', 'fa-kit-medical', 'Botiquín', 'First aid kit'),
            S('safe', 'fa-vault', 'Caja fuerte', 'Safe'),
            S('alarm', 'fa-shield-halved', 'Alarma', 'Alarm system')
        ] },
        { id: 'access', icon: 'fa-key', es: 'Acceso y servicios', en: 'Access and services', items: [
            S('self-checkin', 'fa-key', 'Llegada autónoma', 'Self check-in'),
            S('step-free', 'fa-wheelchair', 'Acceso sin escalones', 'Step-free access'),
            S('ground-floor', 'fa-house', 'Todo en planta baja', 'All on the ground floor'),
            S('elevator', 'fa-elevator', 'Ascensor', 'Lift'),
            S('long-stays', 'fa-calendar-check', 'Se admiten estancias largas', 'Long stays allowed'),
            S('luggage', 'fa-suitcase', 'Consigna de equipaje', 'Luggage storage'),
            S('cleaning-extra', 'fa-broom', 'Limpieza durante la estancia (opcional)', 'Cleaning during your stay (optional)')
        ] }
    ];

    var types = [
        { id: 'casa-rural', es: 'Casa rural', en: 'Country house' },
        { id: 'villa', es: 'Villa', en: 'Villa' },
        { id: 'chalet', es: 'Chalet', en: 'Detached house' },
        { id: 'adosado', es: 'Casa adosada', en: 'Townhouse' },
        { id: 'cortijo', es: 'Cortijo o finca', en: 'Country estate' },
        { id: 'apartamento', es: 'Apartamento', en: 'Apartment' },
        { id: 'atico', es: 'Ático', en: 'Penthouse' },
        { id: 'estudio', es: 'Estudio', en: 'Studio' },
        { id: 'loft', es: 'Loft', en: 'Loft' },
        { id: 'bungalow', es: 'Bungalow', en: 'Bungalow' }
    ];

    // Normas de la casa. "label" es lo que se ve en el panel; es/en, la frase que se publica.
    var house = [
        { id: 'pets', label: 'Mascotas', options: [
            { id: 'yes', label: 'Se admiten', es: 'Se admiten mascotas', en: 'Pets allowed' },
            { id: 'ask', label: 'Bajo petición', es: 'Mascotas bajo petición', en: 'Pets on request' },
            { id: 'no', label: 'No', es: 'No se admiten mascotas', en: 'No pets' }] },
        { id: 'smoking', label: 'Fumar', options: [
            { id: 'no', label: 'No', es: 'No se permite fumar', en: 'No smoking' },
            { id: 'outside', label: 'Solo en el exterior', es: 'Se permite fumar solo en el exterior', en: 'Smoking allowed outdoors only' },
            { id: 'yes', label: 'Sí', es: 'Se permite fumar', en: 'Smoking allowed' }] },
        { id: 'parties', label: 'Fiestas y eventos', options: [
            { id: 'no', label: 'No', es: 'No se permiten fiestas ni eventos', en: 'No parties or events' },
            { id: 'ask', label: 'Bajo petición', es: 'Eventos bajo petición', en: 'Events on request' }] },
        { id: 'children', label: 'Niños', options: [
            { id: 'yes', label: 'Apto', es: 'Apto para niños', en: 'Suitable for children' },
            { id: 'no', label: 'No recomendado', es: 'No recomendado para niños pequeños', en: 'Not recommended for young children' }] },
        { id: 'quiet', label: 'Silencio nocturno', options: [
            { id: '22', label: 'Desde las 22:00', es: 'Silencio a partir de las 22:00', en: 'Quiet hours from 22:00' },
            { id: '23', label: 'Desde las 23:00', es: 'Silencio a partir de las 23:00', en: 'Quiet hours from 23:00' },
            { id: '00', label: 'Desde las 00:00', es: 'Silencio a partir de las 00:00', en: 'Quiet hours from midnight' }] }
    ];

    var cancellation = [
        { id: 'flexible', label: 'Flexible', es: 'Cancelación gratuita hasta 24 horas antes de la llegada.', en: 'Free cancellation up to 24 hours before arrival.' },
        { id: 'moderate', label: 'Moderada', es: 'Cancelación gratuita hasta 5 días antes de la llegada.', en: 'Free cancellation up to 5 days before arrival.' },
        { id: 'firm', label: 'Firme', es: 'Cancelación gratuita hasta 30 días antes de la llegada. Después, reembolso del 50 % hasta 7 días antes.', en: 'Free cancellation up to 30 days before arrival. After that, 50% refund up to 7 days before.' },
        { id: 'strict', label: 'Estricta', es: 'Reembolso del 50 % hasta 14 días antes de la llegada. Después, sin reembolso.', en: '50% refund up to 14 days before arrival. No refund after that.' },
        { id: 'non-refundable', label: 'No reembolsable', es: 'Reserva no reembolsable.', en: 'Non-refundable booking.' },
        { id: 'ask', label: 'A consultar', es: 'Condiciones de cancelación a consultar al reservar.', en: 'Cancellation terms on request when booking.' }
    ];

    // Estancias y camas (singular, plural) para la distribución de camas.
    var roomKinds = [
        { id: 'bedroom', icon: 'fa-bed', es: 'Dormitorio', en: 'Bedroom' },
        { id: 'living', icon: 'fa-couch', es: 'Salón', en: 'Living room' },
        { id: 'other', icon: 'fa-door-open', es: 'Otra estancia', en: 'Other room' }
    ];
    var beds = [
        { id: 'double', label: 'Matrimonio', es: ['cama de matrimonio', 'camas de matrimonio'], en: ['double bed', 'double beds'] },
        { id: 'single', label: 'Individual', es: ['cama individual', 'camas individuales'], en: ['single bed', 'single beds'] },
        { id: 'bunk', label: 'Litera', es: ['litera', 'literas'], en: ['bunk bed', 'bunk beds'] },
        { id: 'sofa', label: 'Sofá cama', es: ['sofá cama', 'sofás cama'], en: ['sofa bed', 'sofa beds'] },
        { id: 'cot', label: 'Cuna', es: ['cuna', 'cunas'], en: ['cot', 'cots'] }
    ];

    // Reservas directas: por dónde llegó y cómo va el pago.
    var channels = [
        { id: 'web', label: 'Web' }, { id: 'whatsapp', label: 'WhatsApp' }, { id: 'phone', label: 'Teléfono' },
        { id: 'email', label: 'Email' }, { id: 'repeat', label: 'Cliente habitual' }, { id: 'other', label: 'Otro' }
    ];
    var payments = [
        { id: 'pending', label: 'Pendiente de pago' }, { id: 'deposit', label: 'Señal pagada' }, { id: 'paid', label: 'Pagada' }
    ];

    // Nombres sugeridos para los precios por fechas.
    var ruleNames = ['Temporada alta', 'Temporada media', 'Temporada baja', 'Fines de semana', 'Festivos y puentes', 'Navidad', 'Semana Santa', 'Evento especial', 'Oferta'];

    var services = {}, byText = {};
    function key(text) { return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
    categories.forEach(function (c) {
        c.items.forEach(function (s) {
            services[s.id] = s;
            [s.es].concat(s.alias).forEach(function (t) { byText[key(t)] = s.id; });
        });
    });
    function find(listOf, id) { for (var i = 0; i < listOf.length; i++) if (listOf[i].id === id) return listOf[i]; return null; }
    function add(arr, v) { if (arr.indexOf(v) < 0) arr.push(v); }

    // Datos antiguos (textos libres en "amenities" y "highlights") -> selección del catálogo.
    // Lo que no coincide con ningún servicio se conserva en "extras".
    function fromLegacy(p) {
        var out = { services: [], featured: [], extras: [] };
        (p.amenities || []).forEach(function (g) {
            var es = (g && g.items && g.items.es) || [], en = (g && g.items && g.items.en) || [];
            es.forEach(function (text, i) {
                var id = byText[key(text)];
                if (id) add(out.services, id);
                else if (text) out.extras.push({ es: text, en: en[i] || text });
            });
        });
        (p.highlights || []).forEach(function (h) {
            var id = h && byText[key(h.es)];
            if (id) { add(out.services, id); add(out.featured, id); }
            else if (h && h.es) out.extras.push({ es: h.es, en: h.en || h.es });
        });
        return out;
    }

    // Temporadas antiguas (mes-día, cada año) -> precios por fechas.
    function seasonsToRules(seasons) {
        var year = new Date().getUTCFullYear();
        return (seasons || []).filter(function (s) { return s && /^\d\d-\d\d$/.test(s.from) && /^\d\d-\d\d$/.test(s.to); }).map(function (s) {
            return { name: 'Temporada', start: year + '-' + s.from, end: (s.to < s.from ? year + 1 : year) + '-' + s.to, price: s.price, minNights: 0, days: [], repeat: true };
        });
    }

    // Selección del panel -> textos e iconos que lee la web (propiedades.js).
    function derive(p) {
        var on = p.services || [];
        var amenities = categories.map(function (c) {
            var items = c.items.filter(function (s) { return on.indexOf(s.id) >= 0; });
            return items.length ? { icon: c.icon, title: { es: c.es, en: c.en },
                items: { es: items.map(function (s) { return s.es; }), en: items.map(function (s) { return s.en; }) } } : null;
        }).filter(Boolean);
        var extras = (p.extraServices || []).filter(function (x) { return x && x.es; });
        if (extras.length) amenities.push({ icon: 'fa-circle-plus', title: { es: 'Otros', en: 'Other' },
            items: { es: extras.map(function (x) { return x.es; }), en: extras.map(function (x) { return x.en || x.es; }) } });

        var rules = { es: [], en: [] };
        house.forEach(function (h) {
            var option = find(h.options, (p.house || {})[h.id]);
            if (option) { rules.es.push(option.es); rules.en.push(option.en); }
        });
        var type = find(types, p.type), policy = find(cancellation, p.cancellation);

        // Distribución de camas: "Dormitorio 1 · 1 cama de matrimonio y 1 cuna".
        var perKind = {}, seen = {};
        var join = function (items, and) { return items.length > 1 ? items.slice(0, -1).join(', ') + and + items[items.length - 1] : items[0]; };
        (p.rooms || []).forEach(function (r) { perKind[r.kind] = (perKind[r.kind] || 0) + 1; });
        var sleeping = (p.rooms || []).map(function (r) {
            var kind = find(roomKinds, r.kind) || roomKinds[0], es = [], en = [];
            seen[r.kind] = (seen[r.kind] || 0) + 1;
            var number = perKind[r.kind] > 1 ? ' ' + seen[r.kind] : '';
            beds.forEach(function (b) {
                var n = (r.beds || {})[b.id] || 0;
                if (n) { es.push(n + ' ' + b.es[n > 1 ? 1 : 0]); en.push(n + ' ' + b.en[n > 1 ? 1 : 0]); }
            });
            return es.length ? { icon: kind.icon, title: { es: kind.es + number, en: kind.en + number }, beds: { es: join(es, ' y '), en: join(en, ' and ') } } : null;
        }).filter(Boolean);

        return {
            sleeping: sleeping,
            amenities: amenities,
            highlights: (p.featured || []).filter(function (id) { return services[id] && on.indexOf(id) >= 0; })
                .map(function (id) { return { icon: services[id].icon, es: services[id].es, en: services[id].en }; }),
            typeLabel: { es: type ? type.es : '', en: type ? type.en : '' },
            houseRules: rules,
            cancellationText: { es: policy ? policy.es : '', en: policy ? policy.en : '' }
        };
    }

    var api = { categories: categories, services: services, types: types, house: house, cancellation: cancellation, ruleNames: ruleNames,
        roomKinds: roomKinds, beds: beds, channels: channels, payments: payments,
        find: find, fromLegacy: fromLegacy, seasonsToRules: seasonsToRules, derive: derive };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.VELLUM_CATALOG = api;
})(typeof window !== 'undefined' ? window : this);
