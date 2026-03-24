document.addEventListener('DOMContentLoaded', function() {
    // Comprueba si el usuario ya ha tomado una decisión
    if (!localStorage.getItem('cookies-vellum')) {
        // Detecta el idioma de la página actual (por defecto 'es')
        const lang = document.documentElement.lang || 'es';
        crearAvisoCookies(lang);
    }
});

function crearAvisoCookies(lang) {
    // Textos en ambos idiomas
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

    // Crear el contenedor flotante
    const banner = document.createElement('div');
    banner.id = 'banner-flotante-cookies';
    
    // Clases de Tailwind para posicionarlo abajo a la derecha y darle estilo Vellum
    banner.className = 'fixed bottom-6 right-6 w-[calc(100%-3rem)] md:w-80 z-[9999] bg-white dark:bg-brand-darkcard border border-brand-dark/10 dark:border-white/10 shadow-2xl p-6 rounded-sm transition-all duration-500 transform translate-y-0 opacity-100';

    banner.innerHTML = `
        <div class="flex flex-col space-y-4">
            <div>
                <h3 class="font-serif text-lg text-brand-dark dark:text-white font-bold mb-1">${t.titulo}</h3>
                <p class="text-xs text-brand-dark/70 dark:text-white/70 leading-relaxed">${t.desc}</p>
            </div>
            <div class="flex flex-col space-y-3">
                <button onclick="accionCookies('aceptadas')" class="w-full bg-brand-gold text-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-dark transition-all duration-300 shadow-sm">${t.aceptar}</button>
                
                <div class="flex justify-between items-center px-1">
                    <button onclick="accionCookies('rechazadas')" class="text-[10px] font-bold uppercase tracking-widest text-brand-dark/50 dark:text-white/50 hover:text-brand-dark dark:hover:text-white transition-colors">${t.rechazar}</button>
                    <a href="${t.enlace}" class="text-[10px] font-bold uppercase tracking-widest text-brand-gold hover:text-brand-dark dark:hover:text-white transition-colors">${t.info}</a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(banner);
}

function accionCookies(decision) {
    // Guarda la decisión en el navegador del usuario
    localStorage.setItem('cookies-vellum', decision);
    
    // Oculta el banner con una animación suave
    const banner = document.getElementById('banner-flotante-cookies');
    banner.classList.add('translate-y-4', 'opacity-0');
    
    setTimeout(() => {
        banner.remove();
    }, 500);
}