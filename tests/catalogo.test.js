// Tests de la ruta fotográfica (catalogo.js): fotos agrupadas por estancias para la ficha.
// Ejecutar con: node --test "tests/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../catalogo');

const rooms = [
    { kind: 'bedroom', beds: { double: 1 } },
    { kind: 'bedroom', beds: { single: 2 } },
    { kind: 'living', beds: { sofa: 1 } },
];

test('parseSpace: acepta estancias del catálogo, con número solo las numeradas', () => {
    assert.equal(C.parseSpace('bedroom-2').n, 2);
    assert.equal(C.parseSpace('kitchen').space.id, 'kitchen');
    assert.equal(C.parseSpace('bedroom'), null);      // falta el número
    assert.equal(C.parseSpace('kitchen-1'), null);    // la cocina no va numerada
    assert.equal(C.parseSpace('bedroom-0'), null);
    assert.equal(C.parseSpace('sotano'), null);
});

test('photoTour: agrupa por estancia en el orden del catálogo, con las demás al final', () => {
    const gallery = ['a', 'b', 'c', 'd', 'e', 'f'];
    const photoRooms = { a: 'pool', b: 'bedroom-2', c: 'living', d: 'bedroom-1', e: 'bedroom-2' };
    const tour = C.derive({ rooms, gallery, photoRooms }).photoTour;
    assert.deepEqual(tour.map(g => [g.id, g.title.es, g.photos]), [
        ['living', 'Salón', [2]],
        ['bedroom-1', 'Dormitorio 1', [3]],
        ['bedroom-2', 'Dormitorio 2', [1, 4]],
        ['pool', 'Piscina', [0]],
        ['extra', 'Fotos adicionales', [5]],
    ]);
    // Camas de cada dormitorio y del salón, según la distribución de camas.
    assert.equal(tour[1].sub.es, '1 cama de matrimonio');
    assert.equal(tour[2].sub.en, '2 single beds');
    assert.equal(tour[0].sub.es, '1 sofá cama');
});

test('photoTour: sin número si solo hay fotos de un dormitorio; vacía si no hay ninguna asignada', () => {
    const one = C.derive({ rooms, gallery: ['a', 'b'], photoRooms: { a: 'bathroom-1' } }).photoTour;
    assert.equal(one[0].title.es, 'Baño completo');
    assert.deepEqual(C.derive({ rooms, gallery: ['a'], photoRooms: {} }).photoTour, []);
});
