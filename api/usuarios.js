const { getRegistro, saveRegistro } = require('./lib/storage');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido.' });
  }

  try {
    const { action, tipoDoc, numDoc, nombre, telefono, email } = req.body || {};

    if (!tipoDoc || !numDoc) {
      return res.status(400).json({ success: false, error: 'Tipo y número de documento son obligatorios.' });
    }

    const key = `${tipoDoc.trim().toUpperCase()}-${numDoc.trim()}`;
    const usuarios = await getRegistro('usuarios') || {};

    // ─── LOGIN ──────────────────────────────────────────────
    if (action === 'login') {
      const usuario = usuarios[key];
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado. Por favor regístrate primero.' });
      }
      return res.status(200).json({ success: true, usuario });
    }

    // ─── REGISTRO ───────────────────────────────────────────
    if (action === 'register') {
      if (!nombre || !telefono) {
        return res.status(400).json({ success: false, error: 'Nombre y teléfono son obligatorios.' });
      }

      if (usuarios[key]) {
        return res.status(409).json({ success: false, error: 'Ya existe una cuenta con este documento.' });
      }

      const nuevoUsuario = {
        nombre: nombre.trim(),
        tipoDoc: tipoDoc.trim().toUpperCase(),
        numDoc: numDoc.trim(),
        telefono: telefono.trim(),
        email: (email || '').trim(),
        fechaRegistro: new Date().toISOString()
      };

      usuarios[key] = nuevoUsuario;
      await saveRegistro('usuarios', usuarios);

      return res.status(201).json({ success: true, usuario: nuevoUsuario });
    }

    return res.status(400).json({ success: false, error: 'Acción no válida.' });
  } catch (error) {
    console.error('Error en /api/usuarios:', error);
    return res.status(500).json({ success: false, error: 'Error del servidor al procesar el usuario.' });
  }
};
