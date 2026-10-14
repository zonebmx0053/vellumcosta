// Animaciones al hacer scroll (sustituye a la librería AOS con los mismos atributos):
// data-aos="fade-up | fade-down | fade-left | fade-right | zoom-in", data-aos-delay y
// data-aos-duration en milisegundos. Los estilos están en web.css.
(function () {
    window.vcAnim = true;   // el script de la cabecera ya no tiene que mostrar el contenido por su cuenta
    var items = [].slice.call(document.querySelectorAll('[data-aos]'));

    function show(el) {
        var delay = parseInt(el.getAttribute('data-aos-delay'), 10) || 0;
        var duration = parseInt(el.getAttribute('data-aos-duration'), 10) || 800;
        el.style.transitionDelay = delay + 'ms';
        el.style.transitionDuration = duration + 'ms';
        el.classList.add('aos-animate');
        // Al terminar, el elemento recupera sus propias transiciones (por ejemplo, las de :hover).
        setTimeout(function () {
            el.classList.add('aos-done');
            el.style.transitionDelay = '';
            el.style.transitionDuration = '';
        }, delay + duration + 50);
    }

    if (!('IntersectionObserver' in window)) { items.forEach(show); return; }
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            show(entry.target);
        });
    }, { rootMargin: '0px 0px -50px 0px' });
    items.forEach(function (el) { observer.observe(el); });
})();
