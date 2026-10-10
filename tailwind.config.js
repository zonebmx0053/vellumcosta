// Los colores no se escriben aquí: se leen de colores.css (un único sitio para toda la web).
const color = name => ({ opacityValue }) => opacityValue === undefined
    ? `var(${name})`
    : `color-mix(in srgb,var(${name}) calc(${opacityValue}*100%),transparent)`;

module.exports = {
    darkMode: 'class',
    content: ['./*.html', './*.js'],
    theme: {
        extend: {
            colors: {
                brand: {
                    bg: color('--color-fondo'),
                    gold: color('--color-dorado'),
                    dark: color('--color-texto'),
                    darkmode: color('--color-oscuro-fondo'),
                    darkcard: color('--color-oscuro-tarjeta')
                }
            },
            fontFamily: {
                sans: ['Montserrat', 'sans-serif'],
                serif: ['Playfair Display', 'serif']
            }
        }
    },
    plugins: []
}
