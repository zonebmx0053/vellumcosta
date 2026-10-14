// Tests del cálculo de precios y reglas de reserva (precios.js), el mismo que usan la ficha
// pública y el panel. Ejecutar con: node --test "tests/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../precios');

const TODAY = '2026-10-14';   // miércoles

test('weekday: 0 = lunes … 6 = domingo', () => {
    assert.equal(P.weekday('2026-10-12'), 0);
    assert.equal(P.weekday('2026-10-18'), 6);
});

test('nightPrice: precio base cuando ninguna regla incluye la noche', () => {
    assert.equal(P.nightPrice({ price: { base: 100 } }, '2026-11-02'), 100);
});

test('nightPrice: precio de temporada dentro de sus fechas (ambas incluidas)', () => {
    const p = { price: { base: 100, rules: [{ start: '2026-07-01', end: '2026-08-31', price: 180 }] } };
    assert.equal(P.nightPrice(p, '2026-07-01'), 180);
    assert.equal(P.nightPrice(p, '2026-08-31'), 180);
    assert.equal(P.nightPrice(p, '2026-09-01'), 100);
});

test('nightPrice: una regla que se repite cada año cruza el cambio de año', () => {
    const p = { price: { base: 100, rules: [{ start: '2025-12-20', end: '2026-01-06', price: 150, repeat: true }] } };
    assert.equal(P.nightPrice(p, '2026-12-25'), 150);
    assert.equal(P.nightPrice(p, '2027-01-06'), 150);
    assert.equal(P.nightPrice(p, '2026-12-19'), 100);
    assert.equal(P.nightPrice(p, '2027-01-07'), 100);
});

test('nightPrice: una regla limitada a ciertos días solo se aplica esas noches', () => {
    const p = { price: { base: 100, rules: [{ start: '2026-01-01', end: '2027-12-31', price: 130, days: [4, 5] }] } };
    assert.equal(P.nightPrice(p, '2026-10-16'), 130);   // viernes
    assert.equal(P.nightPrice(p, '2026-10-17'), 130);   // sábado
    assert.equal(P.nightPrice(p, '2026-10-15'), 100);   // jueves
});

test('nightPrice: si dos reglas coinciden, manda la primera de la lista', () => {
    const p = { price: { base: 100, rules: [
        { start: '2026-08-10', end: '2026-08-20', price: 250 },
        { start: '2026-07-01', end: '2026-08-31', price: 180 },
    ] } };
    assert.equal(P.nightPrice(p, '2026-08-15'), 250);
    assert.equal(P.nightPrice(p, '2026-08-25'), 180);
});

test('nightPrice: el descuento de una regla se aplica sobre el precio de otra', () => {
    const p = { price: { base: 100, rules: [
        { start: '2026-11-01', end: '2026-11-30', discount: 20 },
        { start: '2026-11-01', end: '2026-12-31', price: 120 },
    ] } };
    assert.equal(P.nightPrice(p, '2026-11-10'), 96);    // 120 − 20 %
    assert.equal(P.nightPrice(p, '2026-12-10'), 120);
});

test('nightPrice: redondea a céntimos', () => {
    const p = { price: { base: 99.99, rules: [{ start: '2026-11-01', end: '2026-11-30', discount: 15 }] } };
    assert.equal(P.nightPrice(p, '2026-11-10'), 84.99);
});

test('nightPrice: temporadas del formato antiguo (mes-día), aún sin guardar desde el panel', () => {
    const p = { price: { base: 90, seasons: [{ from: '12-20', to: '01-06', price: 140 }] } };
    assert.equal(P.nightPrice(p, '2026-12-31'), 140);
    assert.equal(P.nightPrice(p, '2027-02-01'), 90);
});

test('lowestPrice: tiene en cuenta los descuentos por fechas para el "Desde …"', () => {
    const p = { price: { base: 100, rules: [{ start: '2026-11-01', end: '2026-11-30', discount: 20 }] } };
    assert.equal(P.lowestPrice(p, TODAY), 80);
    assert.equal(P.lowestPrice({ price: { base: 100 } }, TODAY), 100);
});

test('minNights: la estancia mínima puede depender del día de entrada', () => {
    const p = { price: { base: 100, minNights: 3, rules: [{ start: '2026-08-01', end: '2026-08-31', minNights: 7 }] } };
    assert.equal(P.minNights(p, '2026-08-05'), 7);
    assert.equal(P.minNights(p, '2026-09-05'), 3);
    assert.equal(P.minNights({ price: {} }, '2026-09-05'), 1);
});

test('canArrive: antelación mínima, ventana de reserva y días de entrada', () => {
    const p = { stay: { notice: 2, window: 6, checkinDays: [] } };
    assert.equal(P.canArrive(p, '2026-10-15', TODAY), false);   // solo un día de antelación
    assert.equal(P.canArrive(p, '2026-10-16', TODAY), true);
    assert.equal(P.lastDay(p, TODAY), '2027-04-14');
    assert.equal(P.canArrive(p, '2027-04-13', TODAY), true);
    assert.equal(P.canArrive(p, '2027-04-14', TODAY), false);

    const saturdays = { stay: { checkinDays: [5] } };
    assert.equal(P.canArrive(saturdays, '2026-10-17', TODAY), true);
    assert.equal(P.canArrive(saturdays, '2026-10-16', TODAY), false);
    assert.equal(P.canArrive(saturdays, '2026-10-10', TODAY), false);   // ya pasado
});

test('discount: si corresponden varios descuentos, solo se aplica el mayor', () => {
    const p = { price: { discounts: { weekly: 10, monthly: 25, earlyDays: 90, earlyPercent: 15, lastDays: 7, lastPercent: 5 } } };
    assert.deepEqual(P.discount(p, '2026-11-01', 7, TODAY), { type: 'weekly', percent: 10 });
    assert.deepEqual(P.discount(p, '2027-03-01', 7, TODAY), { type: 'early', percent: 15 });
    assert.deepEqual(P.discount(p, '2027-03-01', 28, TODAY), { type: 'monthly', percent: 25 });
    assert.deepEqual(P.discount(p, '2026-10-17', 3, TODAY), { type: 'last', percent: 5 });
    assert.equal(P.discount(p, '2026-11-01', 3, TODAY), null);
});

test('quote: suma noches, huéspedes adicionales y limpieza', () => {
    const p = { price: { base: 100, cleaningFee: 50, extraGuestAfter: 4, extraGuestFee: 20 } };
    assert.deepEqual(P.quote(p, '2026-11-02', '2026-11-05', 6, TODAY), {
        nights: 3, stay: 300, extraGuests: 2, extra: 120, discount: null, cleaning: 50, total: 470,
    });
    // Sin pasar del límite de huéspedes no hay suplemento.
    assert.equal(P.quote(p, '2026-11-02', '2026-11-05', 4, TODAY).total, 350);
});

test('quote: el descuento de estancia no se aplica a la limpieza', () => {
    const p = { price: { base: 100, cleaningFee: 50, extraGuestAfter: 4, extraGuestFee: 20, discounts: { weekly: 10 } } };
    const q = P.quote(p, '2026-11-02', '2026-11-09', 6, TODAY);
    assert.equal(q.nights, 7);
    assert.deepEqual(q.discount, { type: 'weekly', percent: 10, amount: 98 });   // 10 % de (700 + 280)
    assert.equal(q.total, 700 + 280 - 98 + 50);
});

test('quote: cada noche con su propio precio, también si la estancia cambia de temporada', () => {
    const p = { price: { base: 100, rules: [{ start: '2026-12-20', end: '2027-01-06', price: 150 }] } };
    const q = P.quote(p, '2026-12-18', '2026-12-22', 2, TODAY);   // 18 y 19 a 100; 20 y 21 a 150
    assert.equal(q.stay, 500);
    assert.equal(q.total, 500);
});
