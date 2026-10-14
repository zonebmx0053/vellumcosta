// Tests del calendario: lectura de los iCal de las plataformas y fusión de fechas ocupadas.
// Ejecutar con: node --test "tests/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseIcal, mergeRanges, envKey } = require('../api/availability');

// Calendario de ejemplo con el formato que envían Airbnb, Vrbo y Booking (líneas CRLF).
const ical = (...events) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Test//ES',
    ...events.flatMap(e => ['BEGIN:VEVENT', ...e, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');

test('parseIcal: lee fechas de día completo; la salida no cuenta como noche ocupada', () => {
    const text = ical(['DTSTART;VALUE=DATE:20261101', 'DTEND;VALUE=DATE:20261105', 'SUMMARY:Reserved']);
    assert.deepEqual(parseIcal(text), [{ start: '2026-11-01', end: '2026-11-05', summary: 'Reserved', url: '' }]);
});

test('parseIcal: con fecha y hora se queda solo con el día', () => {
    const text = ical(['DTSTART:20261101T150000Z', 'DTEND:20261103T100000Z']);
    assert.deepEqual(parseIcal(text).map(r => [r.start, r.end]), [['2026-11-01', '2026-11-03']]);
});

test('parseIcal: sin DTEND, o con DTEND no posterior, ocupa una sola noche', () => {
    const text = ical(['DTSTART;VALUE=DATE:20261231'], ['DTSTART;VALUE=DATE:20270110', 'DTEND;VALUE=DATE:20270110']);
    assert.deepEqual(parseIcal(text).map(r => [r.start, r.end]), [['2026-12-31', '2027-01-01'], ['2027-01-10', '2027-01-11']]);
});

test('parseIcal: ignora las reservas canceladas y los eventos sin inicio', () => {
    const text = ical(
        ['DTSTART;VALUE=DATE:20261101', 'DTEND;VALUE=DATE:20261103', 'STATUS:CANCELLED'],
        ['SUMMARY:Sin fechas'],
        ['DTSTART;VALUE=DATE:20261110', 'DTEND;VALUE=DATE:20261112']);
    assert.deepEqual(parseIcal(text).map(r => r.start), ['2026-11-10']);
});

test('parseIcal: une las líneas partidas y limpia los escapes del texto', () => {
    const text = ical(['DTSTART;VALUE=DATE:20261101', 'DTEND;VALUE=DATE:20261102',
        'SUMMARY:CLOSED - Not available\\, back\\;soon', 'DESCRIPTION:Reservation URL: https://www.airbnb.es/hosting/reser',
        ' vations/details/HMABC123\\nPhone: +34']);
    const [event] = parseIcal(text);
    assert.equal(event.summary, 'CLOSED - Not available, back;soon');
    assert.equal(event.url, 'https://www.airbnb.es/hosting/reservations/details/HMABC123');
});

test('parseIcal: acepta saltos de línea LF y nombres en minúsculas', () => {
    const text = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\ndtstart;value=date:20261101\ndtend;value=date:20261102\nEND:VEVENT\nEND:VCALENDAR';
    assert.deepEqual(parseIcal(text).map(r => [r.start, r.end]), [['2026-11-01', '2026-11-02']]);
});

test('parseIcal: rechaza lo que no es un calendario (por ejemplo, una página de error)', () => {
    assert.throws(() => parseIcal('<html>Not found</html>'), /not_ical/);
    assert.throws(() => parseIcal(undefined), /not_ical/);
});

const TODAY = '2026-10-14';

test('mergeRanges: une reservas solapadas y consecutivas, y ordena', () => {
    const merged = mergeRanges([
        { start: '2026-11-10', end: '2026-11-15' },
        { start: '2026-11-01', end: '2026-11-05' },
        { start: '2026-11-05', end: '2026-11-07' },   // empieza el día que sale la anterior
        { start: '2026-11-03', end: '2026-11-04' },   // dentro de la primera
    ], { today: TODAY });
    assert.deepEqual(merged, [{ start: '2026-11-01', end: '2026-11-07' }, { start: '2026-11-10', end: '2026-11-15' }]);
});

test('mergeRanges: descarta lo pasado y conserva la estancia en curso', () => {
    const merged = mergeRanges([
        { start: '2026-10-01', end: '2026-10-05' },   // ya pasada
        { start: '2026-10-10', end: '2026-10-14' },   // los huéspedes salen hoy: la noche de hoy está libre
        { start: '2026-10-12', end: '2026-10-16' },   // en curso
    ], { today: TODAY });
    assert.deepEqual(merged, [{ start: '2026-10-12', end: '2026-10-16' }]);
    assert.deepEqual(mergeRanges([{ start: '2026-10-10', end: '2026-10-14' }], { today: TODAY }), []);
});

test('mergeRanges: las noches de margen amplían cada reserva y pueden unir dos cercanas', () => {
    const merged = mergeRanges([
        { start: '2026-11-01', end: '2026-11-05' },
        { start: '2026-11-07', end: '2026-11-09' },   // dos noches libres entre medias: con 1 de margen por lado, se cierran
    ], { today: TODAY, bufferDays: 1 });
    assert.deepEqual(merged, [{ start: '2026-10-31', end: '2026-11-10' }]);
});

test('mergeRanges: cruza el cambio de año sin perder noches', () => {
    const merged = mergeRanges([{ start: '2026-12-30', end: '2027-01-02' }, { start: '2027-01-02', end: '2027-01-04' }], { today: TODAY });
    assert.deepEqual(merged, [{ start: '2026-12-30', end: '2027-01-04' }]);
});

test('mergeRanges: como en /api/availability, el margen se aplica a las reservas pero no a los bloqueos', () => {
    const reservations = [{ start: '2026-11-10', end: '2026-11-12' }];
    const blocks = [{ start: '2026-11-20', end: '2026-11-22' }];
    const busy = mergeRanges([...mergeRanges(reservations, { today: TODAY, bufferDays: 1 }), ...blocks], { today: TODAY });
    assert.deepEqual(busy, [{ start: '2026-11-09', end: '2026-11-13' }, { start: '2026-11-20', end: '2026-11-22' }]);
});

test('envKey: nombre de la variable de entorno de cada calendario', () => {
    assert.equal(envKey('casa-1', 'airbnb'), 'ICAL_CASA_1_AIRBNB');
});
