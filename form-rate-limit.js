(function () {

    // ── Rate Limiting ──────────────────────────────────────────────────────────
    var RL_KEY = 'vc_form_submissions';
    var RL_MAX = 3;
    var RL_WIN = 60 * 1000;

    window.formRateLimit = {
        check: function () {
            var now = Date.now();
            var ts  = JSON.parse(localStorage.getItem(RL_KEY) || '[]');
            ts = ts.filter(function (t) { return now - t < RL_WIN; });
            if (ts.length >= RL_MAX) {
                return { allowed: false, waitSeconds: Math.ceil((RL_WIN - (now - ts[0])) / 1000) };
            }
            return { allowed: true };
        },
        record: function () {
            var now = Date.now();
            var ts  = JSON.parse(localStorage.getItem(RL_KEY) || '[]');
            ts = ts.filter(function (t) { return now - t < RL_WIN; });
            ts.push(now);
            localStorage.setItem(RL_KEY, JSON.stringify(ts));
        }
    };

    // ── Sanitization & Validation ──────────────────────────────────────────────
    function clean(v) { return String(v || '').trim(); }

    function validEmail(v) {
        return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(v);
    }

    function validPhone(v) {
        return /^[\d\s\+\-\(\)\.]{7,20}$/.test(v);
    }

    // Patterns that indicate XSS, template injection or SQL injection attempts
    var MALICIOUS = [
        /<script[\s\S]*?>/i,
        /javascript\s*:/i,
        /on\w+\s*=/i,
        /<\s*iframe/i,
        /vbscript\s*:/i,
        /data\s*:\s*text\/html/i,
        /\{\{[\s\S]*?\}\}/,
        /UNION[\s\S]+SELECT/i,
        /(?:DROP|DELETE|INSERT|UPDATE)\s+\w/i
    ];

    function isMalicious(v) {
        return MALICIOUS.some(function (re) { return re.test(v); });
    }

    // ── Form Security ──────────────────────────────────────────────────────────
    window.formSecurity = {
        validate: function (form, lang) {
            var es = (lang !== 'en');

            // Honeypot – Formspree also rejects non-empty _gotcha server-side
            var trap = form.querySelector('input[name="_gotcha"]');
            if (trap && trap.value !== '') return { valid: false, message: '' };

            var nombre    = clean((form.querySelector('[name="nombre"]')    || {}).value);
            var email     = clean((form.querySelector('[name="email"]')     || {}).value);
            var telefono  = clean((form.querySelector('[name="telefono"]')  || {}).value);
            var ubicacion = clean((form.querySelector('[name="ubicacion"]') || {}).value);
            var mensaje   = clean((form.querySelector('[name="mensaje"]')   || {}).value);

            var fields = [nombre, email, telefono, ubicacion, mensaje];
            for (var i = 0; i < fields.length; i++) {
                if (isMalicious(fields[i])) {
                    return { valid: false, message: es
                        ? 'El formulario contiene contenido no permitido.'
                        : 'The form contains disallowed content.' };
                }
            }

            if (nombre.length < 2 || nombre.length > 150) {
                return { valid: false, message: es
                    ? 'El nombre debe tener entre 2 y 150 caracteres.'
                    : 'Name must be between 2 and 150 characters.' };
            }

            if (!validEmail(email)) {
                return { valid: false, message: es
                    ? 'Introduce un correo electrónico válido.'
                    : 'Please enter a valid email address.' };
            }

            if (!validPhone(telefono)) {
                return { valid: false, message: es
                    ? 'Introduce un teléfono válido (7–20 dígitos, espacios o +).'
                    : 'Please enter a valid phone number (7–20 digits, spaces or +).' };
            }

            if (mensaje.length > 2000) {
                return { valid: false, message: es
                    ? 'El mensaje no puede superar los 2000 caracteres.'
                    : 'Message cannot exceed 2000 characters.' };
            }

            return { valid: true };
        }
    };

})();
