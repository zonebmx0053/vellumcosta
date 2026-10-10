// GET /api/properties
// Devuelve, como script, los datos de las propiedades guardados desde el panel (/admin).
// Las páginas lo cargan después de propiedades-data.js: si aquí hay datos, sustituyen a los
// del archivo; si no hay o el almacén falla, la web sigue funcionando con los del archivo.

const { loadData, publicData } = require('./_lib');

module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    try {
        const data = await loadData();
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
        if (!data) return res.status(200).send('// Sin datos guardados en el panel: se usan los de propiedades-data.js\n');
        const json = JSON.stringify(publicData(data)).replace(/</g, '\\u003c');
        return res.status(200).send(`window.VELLUM_PROPERTIES = ${json};\n`);
    } catch (e) {
        if (e.message !== 'store_not_configured') console.error(`properties: ${e.message}`);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).send('// Panel no disponible: se usan los datos de propiedades-data.js\n');
    }
};
