// Datos de las propiedades (español e inglés).
//
// ATENCIÓN: desde que existe el panel privado (/admin), lo que se guarda allí sustituye a
// este archivo en la web publicada (lo sirve /api/properties). Este archivo queda como punto
// de partida del panel y como respaldo si el almacén de datos no está disponible, así que
// los cambios del día a día se hacen en el panel, no aquí.
//
// demo: true  -> la página usa fechas ocupadas de ejemplo y muestra un aviso de "demostración".
// demo: false -> la página consulta los calendarios reales (función /api/availability).
window.VELLUM_PROPERTIES = {
    demo: true,

    contact: {
        phone: '+34 642 827 794',
        tel: '+34642827794',
        whatsapp: '34642827794',
        email: 'info@vellumcosta.com'
    },

    properties: [
        {
            id: 'casa-1',
            // Texto que aparece en la dirección de la página: propiedad.html?casa=casa-piedra-rio-grande
            slug: 'casa-piedra-rio-grande',
            name: { es: 'Casa Piedra Río Grande | Encanto Rural & Piscina', en: 'Casa Piedra Río Grande | Rural Charm & Pool' },
            // Zona o municipio. Si se deja vacío no se muestra la etiqueta sobre la foto.
            location: { es: 'Coín', en: 'Coín' },
            province: 'Málaga',
            // Número de registro turístico. Si se deja vacío no se muestra.
            license: 'VUT/MA/102015',
            image: 'fotos/casa-1/02.jpg',
            imageAlt: { es: 'Piscina, tumbonas y fachada de Casa Piedra Río Grande', en: 'Pool, sun loungers and façade of Casa Piedra Río Grande' },
            // Fotos de la galería, en el orden en que se ven. La primera es la portada.
            // Hay una copia pequeña de cada foto en la subcarpeta "thumbs" (tira de miniaturas de la galería).
            thumbs: true,
            gallery: [
                'fotos/casa-1/02.jpg', 'fotos/casa-1/01.jpg', 'fotos/casa-1/03.jpg', 'fotos/casa-1/04.jpg', 'fotos/casa-1/05.jpg',
                'fotos/casa-1/06.jpg', 'fotos/casa-1/07.jpg', 'fotos/casa-1/08.jpg', 'fotos/casa-1/09.jpg', 'fotos/casa-1/10.jpg',
                'fotos/casa-1/11.jpg', 'fotos/casa-1/12.jpg', 'fotos/casa-1/13.jpg', 'fotos/casa-1/14.jpg', 'fotos/casa-1/15.jpg',
                'fotos/casa-1/16.jpg', 'fotos/casa-1/17.jpg', 'fotos/casa-1/18.jpg', 'fotos/casa-1/19.jpg', 'fotos/casa-1/20.jpg',
                'fotos/casa-1/21.jpg', 'fotos/casa-1/22.jpg', 'fotos/casa-1/23.jpg', 'fotos/casa-1/24.jpg', 'fotos/casa-1/25.jpg',
                'fotos/casa-1/26.jpg', 'fotos/casa-1/27.jpg', 'fotos/casa-1/28.jpg', 'fotos/casa-1/29.jpg', 'fotos/casa-1/30.jpg',
                'fotos/casa-1/31.jpg', 'fotos/casa-1/32.jpg', 'fotos/casa-1/33.jpg', 'fotos/casa-1/34.jpg', 'fotos/casa-1/35.jpg',
                'fotos/casa-1/36.jpg', 'fotos/casa-1/37.jpg', 'fotos/casa-1/38.jpg', 'fotos/casa-1/39.jpg', 'fotos/casa-1/40.jpg',
                'fotos/casa-1/41.jpg', 'fotos/casa-1/42.jpg', 'fotos/casa-1/43.jpg', 'fotos/casa-1/44.jpg', 'fotos/casa-1/45.jpg'
            ],
            // Resumen corto para la ficha del listado.
            summary: {
                es: 'Casa rural con piscina privada, barbacoa y amplio exterior para grupos y familias de hasta 8 personas. Admite mascotas.',
                en: 'Country house with a private pool, barbecue and generous outdoor space for groups and families of up to 8. Pets welcome.'
            },
            guests: 8,
            bedrooms: 3,
            bathrooms: 2,
            toilets: 1,
            description: {
                es: 'Casa Piedra Río Grande es la opción perfecta para grupos y familias de hasta 8 personas. Cuenta con piscina privada, zona de barbacoa y un amplio entorno exterior pensado para que tanto niños como mascotas disfruten de espacio de sobra para jugar y correr. Un lugar amplio, cómodo y rodeado de naturaleza donde relajarse, organizar comidas en la terraza y vivir unos días de descanso inolvidables. La combinación ideal de espacio, privacidad y comodidad para tus vacaciones.',
                en: 'Casa Piedra Río Grande is the perfect choice for groups and families of up to 8 people. It has a private pool, a barbecue area and generous outdoor grounds designed so that both children and pets have plenty of room to play and run. A spacious, comfortable place surrounded by nature where you can relax, enjoy meals on the terrace and spend a few unforgettable days of rest. The ideal combination of space, privacy and comfort for your holiday.'
            },
            // Recuadros destacados de la página de la casa (además de huéspedes, dormitorios y baños).
            highlights: [
                { icon: 'fa-water-ladder', es: 'Piscina privada', en: 'Private pool' },
                { icon: 'fa-fire-burner', es: 'Barbacoa', en: 'Barbecue' },
                { icon: 'fa-paw', es: 'Admite mascotas', en: 'Pets welcome' },
                { icon: 'fa-square-parking', es: 'Aparcamiento gratis', en: 'Free parking' }
            ],
            // "Qué incluye", por grupos. "icon" es un icono de Font Awesome.
            amenities: [
                { icon: 'fa-water-ladder', title: { es: 'Exterior', en: 'Outdoors' },
                  items: { es: ['Piscina privada', 'Zona de barbacoa', 'Terraza y porche amueblados', 'Aparcamiento gratuito en la finca'],
                           en: ['Private pool', 'Barbecue area', 'Furnished terrace and porch', 'Free parking on the premises'] } },
                { icon: 'fa-utensils', title: { es: 'Cocina y comedor', en: 'Kitchen and dining' },
                  items: { es: ['Cocina equipada', 'Nevera', 'Cafetera', 'Cazuelas, sartenes y utensilios básicos', 'Aceite, sal y pimienta'],
                           en: ['Equipped kitchen', 'Fridge', 'Coffee maker', 'Pots, pans and basic utensils', 'Oil, salt and pepper'] } },
                { icon: 'fa-temperature-half', title: { es: 'Calefacción y refrigeración', en: 'Heating and cooling' },
                  items: { es: ['Aire acondicionado', 'Calefacción'], en: ['Air conditioning', 'Heating'] } },
                { icon: 'fa-bed', title: { es: 'Dormitorio y lavandería', en: 'Bedroom and laundry' },
                  items: { es: ['Sábanas y toallas', 'Lavadora', 'Secadora'], en: ['Bed linen and towels', 'Washing machine', 'Dryer'] } },
                { icon: 'fa-bath', title: { es: 'Baño', en: 'Bathroom' },
                  items: { es: ['Agua caliente', 'Jabón y papel higiénico'], en: ['Hot water', 'Soap and toilet paper'] } },
                { icon: 'fa-wifi', title: { es: 'Internet y ocio', en: 'Internet and entertainment' },
                  items: { es: ['Wifi', 'Televisión'], en: ['Wifi', 'Television'] } }
            ],
            // Texto de la sección "Ubicación" y búsqueda que abre el botón de Google Maps (sin dirección exacta).
            locationText: {
                es: 'La casa se encuentra en el entorno rural de Coín, en el Valle del Guadalhorce (Málaga), rodeada de olivos y naturaleza. Puede ver su situación en el mapa.',
                en: 'The house is set in the countryside of Coín, in the Guadalhorce Valley (Málaga), surrounded by olive trees and nature. You can see where it is on the map.'
            },
            // Coordenadas de la casa (latitud, longitud) y nivel de acercamiento del mapa.
            mapQuery: '36.711145,-4.731890',
            mapZoom: 14,
            checkIn: '15:00',
            checkOut: '10:00',
            pets: {
                es: 'Hasta 2 mascotas gratis. A partir de la tercera, 35 € por mascota adicional y estancia.',
                en: 'Up to 2 pets free of charge. From the third, €35 per additional pet per stay.'
            },
            // Precio por noche en euros. Con base: 0 la web muestra "Precio a consultar".
            // "seasons" sustituye al precio base entre esas fechas (mes-día), por ejemplo:
            //   seasons: [{ from: '06-15', to: '09-15', price: 240 }]
            // approx: true -> el precio base es el mínimo: la web dice "Precio total desde" y avisa de que puede variar.
            price: {
                base: 120,
                seasons: [],
                cleaningFee: 120,
                minNights: 5,
                approx: true
            },
            // Opiniones reales copiadas de las plataformas. "max" es la escala (Airbnb puntúa sobre 5, Booking sobre 10).
            // "text" vacío = valoración sin comentario.
            reviews: [
                { source: 'airbnb', name: 'Wellington Ernesto', date: { es: 'octubre de 2026', en: 'October 2026' }, rating: 5, max: 5,
                  text: 'Una casa estupenda muy limpia como se ve en las fotos zona muy tranquila para desconectar la piscina y la barbacoa excelente todo muy bien muchas gracias halos anfitriones Fernando y María muy atento en todos los sentidos volveríamos ha repetir sin ninguna duda. Muchas gracias.' },
                { source: 'airbnb', name: 'Deisy', date: { es: 'agosto de 2026', en: 'August 2026' }, rating: 5, max: 5,
                  text: 'Hemos pasado una semana estupenda en la casa de María y Fernando. Zona muy tranquila y muy relajante. La casa ideal con todas las comodidades necesarias, Fernando muy atento en todo momento y a disposición de cualquier duda o inconveniente. Añadir que te hace la llegada más amena ya que quedáis en un punto de encuentro y te enseña un camino más fácil de acceso a la casa. Sin duda alguna si ellos quedan igual de contentos con nosotros volveremos a repetir cuando necesitemos otra semanita de “relax”. Muchas gracias por todo. 🤗' },
                { source: 'airbnb', name: 'Carlos', date: { es: 'agosto de 2026', en: 'August 2026' }, rating: 5, max: 5,
                  text: 'La casa super tranquila!!! Para desconectar es ideal.... La piscina es genial para pasar unos días de vacaciones!!! Los anfritiones super bien. En fin 100 x 100 recomendable' },
                { source: 'booking', name: 'Salvador', date: { es: 'agosto de 2026', en: 'August 2026' }, rating: 10, max: 10, text: '' },
                { source: 'booking', name: 'Sara', date: { es: 'septiembre de 2026', en: 'September 2026' }, rating: 8, max: 10, text: '' }
            ],
            // Enlaces a los anuncios. Si se deja vacío (''), el botón no aparece.
            links: {
                airbnb: 'https://www.airbnb.es/h/casapiedrariogrande',
                vrbo: 'https://vrbo.onelink.me/ItNz/qoxphkuv',
                booking: 'https://www.booking.com/Share-6untILd'
            },
            // Solo para la demostración: rangos ocupados, en días contados desde hoy [entrada, salida].
            demoBusy: [[4, 9], [16, 23], [38, 45], [70, 77]]
        }
    ]
};
