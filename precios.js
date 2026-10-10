// Precios y reglas de reserva de un alojamiento. Lo usan la ficha pública (propiedades.js)
// y el panel (admin.js): así el precio que ve el huésped y el que simula el panel salen
// siempre del mismo cálculo. Todas las fechas son textos AAAA-MM-DD.
(function (root) {
    var DAY = 86400000;
    function date(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2])); }
    function iso(d) { return d.toISOString().slice(0, 10); }
    function addDays(s, n) { return iso(new Date(date(s).getTime() + n * DAY)); }
    function diff(a, b) { return Math.round((date(b) - date(a)) / DAY); }
    function weekday(s) { return (date(s).getUTCDay() + 6) % 7; }           // 0 = lunes … 6 = domingo
    function round(n) { return Math.round(n * 100) / 100; }

    // Precios por fechas: primera regla que incluye la noche "d" y define "key" (price o
    // minNights). days: noches de la semana a las que se aplica; vacío = todas.
    function ruleFor(p, d, key) {
        var rules = (p.price && p.price.rules) || [], dow = weekday(d), md = d.slice(5);
        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            if (!r.start || !r.end || !(r[key] > 0) || (r.days && r.days.length && r.days.indexOf(dow) < 0)) continue;
            var a = r.start.slice(5), b = r.end.slice(5);
            if (r.repeat ? (a <= b ? md >= a && md <= b : md >= a || md <= b) : d >= r.start && d <= r.end) return r;
        }
        return null;
    }
    function nightPrice(p, d) {
        var rule = ruleFor(p, d, 'price');
        if (rule) return rule.price;
        // Temporadas del formato antiguo (mes-día), por si los datos aún no se han guardado desde el panel.
        var seasons = (p.price && p.price.seasons) || [], md = d.slice(5);
        for (var i = 0; i < seasons.length; i++) {
            var s = seasons[i];
            if (s.from <= s.to ? (md >= s.from && md <= s.to) : (md >= s.from || md <= s.to)) return s.price;
        }
        return (p.price && p.price.base) || 0;
    }
    // Precio más bajo que se puede llegar a pagar por noche (para el "Desde …").
    function lowestPrice(p, today) {
        var price = p.price || {};
        var prices = (price.seasons || []).concat((price.rules || []).filter(function (r) { return r.price > 0 && (r.repeat || r.end >= today); }));
        return prices.reduce(function (m, s) { return Math.min(m, s.price); }, price.base || 0);
    }
    // Estancia mínima según el día de entrada, y máxima (0 = sin límite).
    function minNights(p, d) {
        var r = d && ruleFor(p, d, 'minNights');
        return r ? r.minNights : (p.price && p.price.minNights) || p.minNights || 1;
    }
    function maxNights(p) { return (p.stay && p.stay.maxNights) || 0; }

    // Primer día en que se puede entrar (antelación mínima) y último día reservable
    // (ventana de reserva en meses; '' = sin límite).
    function firstArrival(p, today) { return addDays(today, (p.stay && p.stay.notice) || 0); }
    function lastDay(p, today) {
        var months = (p.stay && p.stay.window) || 0, d = date(today);
        return months ? iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()))) : '';
    }
    function canArrive(p, d, today) {
        var days = (p.stay && p.stay.checkinDays) || [], last = lastDay(p, today);
        if (d < firstArrival(p, today) || (last && d >= last)) return false;
        return !days.length || days.indexOf(weekday(d)) >= 0;
    }

    // Descuento de una estancia. Si corresponden varios, se aplica solo el mayor.
    function discount(p, a, nights, today) {
        var c = (p.price && p.price.discounts) || {}, ahead = diff(today, a), best = null;
        function offer(type, percent) { if (percent > 0 && (!best || percent > best.percent)) best = { type: type, percent: percent }; }
        if (nights >= 28) offer('monthly', c.monthly);
        if (nights >= 7) offer('weekly', c.weekly);
        if (c.earlyDays > 0 && ahead >= c.earlyDays) offer('early', c.earlyPercent);
        if (c.lastDays > 0 && ahead >= 0 && ahead <= c.lastDays) offer('last', c.lastPercent);
        return best;
    }
    // Presupuesto: entrada "a", salida "b" y número de huéspedes. El descuento se aplica a
    // las noches y a los huéspedes adicionales, no a la limpieza.
    function quote(p, a, b, guests, today) {
        var price = p.price || {}, nights = diff(a, b), stay = 0;
        for (var d = a; d < b; d = addDays(d, 1)) stay += nightPrice(p, d);
        var extraGuests = price.extraGuestAfter > 0 && price.extraGuestFee > 0 ? Math.max(0, (guests || 0) - price.extraGuestAfter) : 0;
        var extra = extraGuests * price.extraGuestFee * nights;
        var off = discount(p, a, nights, today);
        var amount = off ? Math.round((stay + extra) * off.percent / 100) : 0;
        var cleaning = price.cleaningFee || 0;
        return {
            nights: nights, stay: round(stay), extraGuests: extraGuests, extra: round(extra),
            discount: off ? { type: off.type, percent: off.percent, amount: amount } : null,
            cleaning: cleaning, total: round(stay + extra - amount + cleaning)
        };
    }

    var api = { addDays: addDays, diff: diff, weekday: weekday, ruleFor: ruleFor, nightPrice: nightPrice, lowestPrice: lowestPrice,
        minNights: minNights, maxNights: maxNights, firstArrival: firstArrival, lastDay: lastDay, canArrive: canArrive, discount: discount, quote: quote };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.VELLUM_PRICING = api;
})(typeof window !== 'undefined' ? window : this);
