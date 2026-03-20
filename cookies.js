// Control de Cookies Bilingüe - Vellum Costa
document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('cookies-aceptadas')) {
        const lang = document.documentElement.lang || 'es';
        crearBanner(lang);
    }
});

function crearBanner(lang) {
    const texts = {
        es: {
            title: "Su privacidad es importante",
            desc: "Utilizamos cookies para analizar nuestro tráfico y mejorar su experiencia. Puede aceptar todas, rechazarlas o ver los detalles.",
            accept: "Aceptar todas",
            reject: "Rechazar",
            prefs: "Preferencias",
            link: "cookies.html"
        },
        en: {
            title: "Your privacy is important",
            desc: "We use cookies to analyze our traffic and improve your experience. You can accept all, reject them, or view details.",
            accept: "Accept all",
            reject: "Reject",
            prefs: "Preferences",
            link: "cookies-en.html"
        }
    };

    const t = texts[lang] || texts.es;
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'fixed bottom-0 left-0 w-full z-[9999] p-4 transition-all duration-500';
    
    banner.innerHTML = `
        <div class="max-w-7xl mx-auto bg-white dark:bg-brand-darkcard border border-brand-dark/10 dark:border-white/10 shadow-2xl p-6 rounded-sm">
            <div class="flex flex-col md:flex-row items-center justify-between gap-6">
                <div class="flex-1 text-center md:text-left">
                    <h3 class="font-serif text-lg mb-1 text-brand-dark dark:text-white font-bold">${t.title}</h3>
                    <p class="text-xs text-brand-dark/70 dark:text-white/70">${t.desc}</p>
                </div>
                <div class="flex flex-wrap justify-center gap-3">
                    <button onclick="gestionarCookies('rechazar')" class="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 px-4 py-2 transition-all">${t.reject}</button>
                    <a href="${t.link}" class="text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 px-4 py-2 transition-all">${t.prefs}</a>
                    <button onclick="gestionarCookies('aceptar')" class="bg-brand-gold text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-dark transition-all duration-300 shadow-lg">${t.accept}</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(banner);
}

function gestionarCookies(tipo) {
    localStorage.setItem('cookies-aceptadas', tipo === 'aceptar' ? 'todas' : 'rechazadas');
    document.getElementById('cookie-banner').style.opacity = '0';
    setTimeout(() => document.getElementById('cookie-banner').remove(), 500);
}