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
    const { numero, usuario } = req.body || {};

    if (numero === undefined || !usuario) {
      return res.status(400).json({ success: false, error: 'Número y usuario son obligatorios.' });
    }

    const numStr = String(numero).padStart(2, '0');
    const numeros = await getRegistro('numeros') || {};
    const n = numeros[numStr];

    if (!n || n.estado === 'available') {
      return res.status(400).json({ success: false, error: 'El número ya está disponible.' });
    }

    if (n.estado === 'sold') {
      return res.status(403).json({ success: false, error: 'No se puede liberar un número que ya ha sido pagado.' });
    }

    // Verificar que sea el dueño
    const keyUser = `${usuario.tipoDoc}-${usuario.numDoc}`.toUpperCase();
    const keyPart = n.participante ? `${n.participante.tipoDoc}-${n.participante.numDoc}`.toUpperCase() : '';

    if (keyUser !== keyPart) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para liberar este número.' });
    }

    // Liberar
    numeros[numStr] = { estado: 'available', participante: null };
    await saveRegistro('numeros', numeros);

    return res.status(200).json({ success: true, mensaje: `Número ${numStr} liberado.` });
  } catch (error) {
    console.error('Error en /api/liberar:', error);
    return res.status(500).json({ success: false, error: 'Error del servidor al liberar el número.' });
  }
};
