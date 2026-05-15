document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('cookies-vellum')) {
        const lang = document.documentElement.lang || 'es';
        crearAvisoCookies(lang);
    }
});

function crearAvisoCookies(lang) {
    const textos = {
        es: {
            titulo: "Uso de Cookies",
            desc: "Utilizamos cookies propias y de terceros para entender cómo interactúa con nosotros y mejorar su experiencia. Puede aceptar todas o gestionar sus preferencias.",
            aceptar: "Aceptar todas",
            rechazar: "Rechazar",
            info: "Más información",
            enlace: "cookies.html"
        },
        en: {
            titulo: "Cookie Usage",
            desc: "We use our own and third-party cookies to understand how you interact with us and improve your experience. You can accept all or manage your preferences.",
            aceptar: "Accept all",
            rechazar: "Reject",
            info: "More info",
            enlace: "cookies-en.html"
        }
    };

    const t = textos[lang] || textos.es;

    const banner = document.createElement('div');
    banner.id = 'banner-flotante-cookies';

    // Tailwind solo para colores, bordes y sombra — posición e z-index via style inline
    // para no depender de clases arbitrarias que no están en el CSS compilado
    banner.className = 'bg-white dark:bg-brand-darkcard border border-brand-dark/10 dark:border-white/10 shadow-2xl p-6 rounded-sm';
    banner.style.cssText = [
        'position: fixed',
        'bottom: 1.5rem',
        'left: 50%',
        'transform: translateX(-50%)',
        'width: calc(100% - 3rem)',
        'max-width: 28rem',
        'z-index: 9999',
        'transition: opacity 0.4s ease, transform 0.4s ease'
    ].join(';');

    banner.innerHTML = `
        <div class="flex flex-col space-y-4">
            <div>
                <h3 class="font-serif text-lg text-brand-dark dark:text-white font-bold mb-1">${t.titulo}</h3>
                <p class="text-xs text-brand-dark/70 dark:text-white/70 leading-relaxed">${t.desc}</p>
            </div>
            <div class="flex flex-col space-y-3">
                <button onclick="accionCookies('aceptadas')" class="w-full bg-brand-gold text-brand-dark px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-all duration-300 shadow-sm">${t.aceptar}</button>
                <div class="flex justify-between items-center px-1">
                    <button onclick="accionCookies('rechazadas')" class="text-[10px] font-bold uppercase tracking-widest text-brand-dark/75 dark:text-white/75 hover:text-brand-dark dark:hover:text-white transition-colors">${t.rechazar}</button>
                    <a href="${t.enlace}" class="text-[10px] font-bold uppercase tracking-widest text-brand-gold hover:text-brand-dark dark:hover:text-white transition-colors">${t.info}</a>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(banner);
}

function accionCookies(decision) {
    localStorage.setItem('cookies-vellum', decision);
    const banner = document.getElementById('banner-flotante-cookies');
    if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateX(-50%) translateY(1rem)';
        setTimeout(() => { banner.remove(); }, 450);
    }
}
