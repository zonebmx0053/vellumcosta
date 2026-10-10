// /api/admin — servidor del panel privado (/admin).
//   GET                            -> datos guardados (requiere sesión)
//   GET ?events=1                  -> eventos de los calendarios de las plataformas (requiere sesión)
//   POST { action: 'login', password }
//   POST { action: 'logout' }
//   POST { action: 'save', data }  -> valida y guarda (requiere sesión)

const { loadData, saveData, hasSession, sessionCookie, login, sameOrigin, clean, adminPassword } = require('./_lib');
const { loadCalendars } = require('./availability');

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        if (!sameOrigin(req)) return res.status(403).json({ error: 'forbidden' });
        adminPassword();

        if (req.method === 'GET') {
            if (!hasSession(req)) return res.status(401).json({ error: 'unauthorized' });
            const data = await loadData();
            // ?events=1 -> reservas y bloqueos de las plataformas, por alojamiento y con su origen.
            if (req.query && req.query.events) {
                const events = {};
                await Promise.all(((data && data.properties) || []).map(async p => { events[p.id] = await loadCalendars(p.id, p); }));
                return res.status(200).json({ events, at: new Date().toISOString() });
            }
            return res.status(200).json({ data });
        }
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'GET, POST');
            return res.status(405).json({ error: 'method_not_allowed' });
        }

        const body = req.body && typeof req.body === 'object' ? req.body : {};
        if (body.action === 'login') {
            await login(req, body.password);
            res.setHeader('Set-Cookie', sessionCookie());
            return res.status(200).json({ ok: true });
        }
        if (body.action === 'logout') {
            res.setHeader('Set-Cookie', sessionCookie(true));
            return res.status(200).json({ ok: true });
        }
        if (body.action === 'save') {
            if (!hasSession(req)) return res.status(401).json({ error: 'unauthorized' });
            const data = clean(body.data);
            // "rev" cambia en cada guardado: la web lo usa para pedir el calendario actualizado.
            data.rev = Date.now();
            await saveData(data);
            return res.status(200).json({ ok: true, data });
        }
        return res.status(400).json({ error: 'unknown_action' });
    } catch (e) {
        if (!e.status) console.error(`admin: ${e.stack || e.message}`);
        return res.status(e.status || 500).json({ error: e.status ? e.message : 'server_error' });
    }
};
