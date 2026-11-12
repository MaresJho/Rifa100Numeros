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
    const { numero, usuario, carrera, grupo } = req.body || {};

    if (numero === undefined || numero === null || !usuario || !carrera || !grupo) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios para la reserva.' });
    }

    const numStr = String(numero).padStart(2, '0');
    const numeros = await getRegistro('numeros') || {};

    // ─── VALIDACIÓN DE CONCURRENCIA ESTRICTA ────────────────
    const numActual = numeros[numStr];
    if (!numActual) {
      return res.status(400).json({ success: false, error: 'Número no válido en la rifa (00 al 99).' });
    }

    if (numActual.estado !== 'available') {
      return res.status(409).json({
        success: false,
        error: `El número ${numStr} acaba de ser reservado por otro participante. Por favor selecciona otro.`
      });
    }

    // Guardar reserva
    numeros[numStr] = {
      estado: 'reserved',
      participante: {
        nombre: usuario.nombre,
        tipoDoc: usuario.tipoDoc,
        numDoc: usuario.numDoc,
        telefono: usuario.telefono,
        email: usuario.email || '',
        carrera: carrera.trim(),
        grupo: grupo.trim(),
        fechaReserva: new Date().toISOString()
      }
    };

    await saveRegistro('numeros', numeros);

    return res.status(200).json({
      success: true,
      mensaje: `Número ${numStr} reservado exitosamente.`,
      numero: numStr,
      datos: numeros[numStr]
    });
  } catch (error) {
    console.error('Error en /api/reservar:', error);
    return res.status(500).json({ success: false, error: 'Error del servidor al registrar la reserva.' });
  }
};
