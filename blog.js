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
    var gridBtn = button('<svg class="icon" viewBox="0 0 512 512" aria-hidden="true"><path d="M448 96V224H288V96H448zm0 192V416H288V288H448zM224 224H64V96H224V224zM64 288H224V416H64V288zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"/></svg>', t.grid, function () { setView('grid'); });
    var listBtn = button('<svg class="icon" viewBox="0 0 512 512" aria-hidden="true"><path d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"/></svg>', t.list, function () { setView('list'); });
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
        var prev = button('<svg class="icon" viewBox="0 0 448 512" aria-hidden="true"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg><span class="blog-btn-label">' + t.prev + '</span>', t.prev, function () { goTo(page - 1); });
        prev.disabled = page === 1;
        pagination.appendChild(prev);
        for (var p = 1; p <= totalPages; p++) {
            (function (n) {
                var b = button(String(n), t.page + ' ' + n, function () { goTo(n); });
                if (n === page) { b.classList.add('is-active'); b.setAttribute('aria-current', 'page'); }
                pagination.appendChild(b);
            })(p);
        }
        var next = button('<span class="blog-btn-label">' + t.next + '</span><svg class="icon" viewBox="0 0 448 512" aria-hidden="true"><path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/></svg>', t.next, function () { goTo(page + 1); });
        next.disabled = page === totalPages;
        pagination.appendChild(next);
    }

    render();
})();
