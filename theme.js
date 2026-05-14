(function () {
    var darkIcon   = document.getElementById('theme-toggle-dark-icon');
    var lightIcon  = document.getElementById('theme-toggle-light-icon');
    var toggleBtn  = document.getElementById('theme-toggle');
    var menuBtn    = document.getElementById('mobile-menu-button');
    var mobileMenu = document.getElementById('mobile-menu');

    if (localStorage.getItem('color-theme') === 'dark' ||
        (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        if (lightIcon) lightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        if (darkIcon) darkIcon.classList.remove('hidden');
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            if (darkIcon)  darkIcon.classList.toggle('hidden');
            if (lightIcon) lightIcon.classList.toggle('hidden');
            var isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('color-theme', isDark ? 'dark' : 'light');
        });
    }

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', function () {
            var nowHidden = mobileMenu.classList.toggle('hidden');
            menuBtn.setAttribute('aria-expanded', String(!nowHidden));
        });
    }
})();
