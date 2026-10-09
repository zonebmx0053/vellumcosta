// Blog: paginación sin recargar la página y selector de vista (cuadrícula / lista)
(function () {
    var PER_PAGE = 15;
    var grid = document.getElementById('blog-grid');
    var toolbar = document.getElementById('blog-toolbar');
    var pagination = document.getElementById('blog-pagination');
    if (!grid || !toolbar || !pagination) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll(':scope > article'));
    var totalPages = Math.ceil(cards.length / PER_PAGE);
    var en = (document.documentElement.lang || '').indexOf('en') === 0;
    var t = en
        ? { showing: 'Showing', of: 'of', articles: 'articles', grid: 'Grid view', list: 'List view', prev: 'Previous', next: 'Next', page: 'Page' }
        : { showing: 'Mostrando', of: 'de', articles: 'artículos', grid: 'Vista en cuadrícula', list: 'Vista en lista', prev: 'Anterior', next: 'Siguiente', page: 'Página' };

    function read(store, key) { try { return window[store].getItem(key); } catch (e) { return null; } }
    function write(store, key, value) { try { window[store].setItem(key, value); } catch (e) { } }

    var page = parseInt(read('sessionStorage', 'blog-page'), 10) || 1;
    if (page < 1 || page > totalPages) page = 1;
    var view = read('localStorage', 'blog-view') === 'list' ? 'list' : 'grid';

    function button(html, label, onClick) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'blog-btn';
        b.innerHTML = html;
        if (label) b.setAttribute('aria-label', label);
        b.addEventListener('click', onClick);
        return b;
    }

    var count = document.createElement('p');
    count.className = 'blog-count';
    count.setAttribute('aria-live', 'polite');

    var viewBox = document.createElement('div');
    viewBox.className = 'blog-view';
    var gridBtn = button('<i class="fa-solid fa-table-cells-large" aria-hidden="true"></i>', t.grid, function () { setView('grid'); });
    var listBtn = button('<i class="fa-solid fa-list" aria-hidden="true"></i>', t.list, function () { setView('list'); });
    viewBox.appendChild(gridBtn);
    viewBox.appendChild(listBtn);

    toolbar.className = 'blog-toolbar';
    toolbar.appendChild(count);
    toolbar.appendChild(viewBox);
    pagination.className = 'blog-pagination';

    // Las tarjetas que aparecen tras un clic no deben esperar a la animación de scroll
    function revealAll() {
        cards.forEach(function (c) { c.classList.add('aos-animate'); });
    }

    function setView(v) {
        view = v;
        write('localStorage', 'blog-view', v);
        revealAll();
        render();
    }

    function goTo(p) {
        if (p < 1 || p > totalPages || p === page) return;
        page = p;
        write('sessionStorage', 'blog-page', String(p));
        revealAll();
        render();
        var top = toolbar.getBoundingClientRect().top + window.pageYOffset - 110;
        window.scrollTo({ top: top, behavior: 'smooth' });
    }

    function render() {
        var start = (page - 1) * PER_PAGE;
        var end = Math.min(start + PER_PAGE, cards.length);
        cards.forEach(function (c, i) { c.hidden = i < start || i >= end; });

        grid.classList.toggle('is-list', view === 'list');
        gridBtn.classList.toggle('is-active', view === 'grid');
        listBtn.classList.toggle('is-active', view === 'list');
        gridBtn.setAttribute('aria-pressed', String(view === 'grid'));
        listBtn.setAttribute('aria-pressed', String(view === 'list'));

        count.textContent = t.showing + ' ' + (start + 1) + '–' + end + ' ' + t.of + ' ' + cards.length + ' ' + t.articles;

        pagination.innerHTML = '';
        if (totalPages < 2) return;
        var prev = button('<i class="fa-solid fa-arrow-left" aria-hidden="true"></i><span class="blog-btn-label">' + t.prev + '</span>', t.prev, function () { goTo(page - 1); });
        prev.disabled = page === 1;
        pagination.appendChild(prev);
        for (var p = 1; p <= totalPages; p++) {
            (function (n) {
                var b = button(String(n), t.page + ' ' + n, function () { goTo(n); });
                if (n === page) { b.classList.add('is-active'); b.setAttribute('aria-current', 'page'); }
                pagination.appendChild(b);
            })(p);
        }
        var next = button('<span class="blog-btn-label">' + t.next + '</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i>', t.next, function () { goTo(page + 1); });
        next.disabled = page === totalPages;
        pagination.appendChild(next);
    }

    render();
})();
