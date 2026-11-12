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
    const body = req.body || {};
    const numero = body.numero;
    
    // Extracción de campos con retrocompatibilidad
    const documento = (body.documento || body.numDoc || body.usuario?.numDoc || '').toString().trim();
    const nombre = (body.nombre || body.usuario?.nombre || '').toString().trim();
    const telefono = (body.telefono || body.usuario?.telefono || '').toString().trim();
    const referenciaPago = (body.referenciaPago || body.refPago || body.comprobante || '').toString().trim();
    
    // Campos opcionales
    const curso = (body.curso || body.carrera || body.grupo || body.usuario?.curso || '').toString().trim();
    const email = (body.email || body.usuario?.email || '').toString().trim();
    const tipoDoc = (body.tipoDoc || body.usuario?.tipoDoc || 'CC').toString().trim();

    if (numero === undefined || numero === null || !documento || !nombre || !telefono || !referenciaPago) {
      return res.status(400).json({
        success: false,
        error: 'Los campos Documento, Nombre, Teléfono y Referencia de pago son obligatorios.'
      });
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
        error: `El número ${numStr} ya no está disponible (fue seleccionado recientemente por otra persona). Por favor selecciona otro.`
      });
    }

    // Guardar reserva sin posibilidad de modificación desde el index
    numeros[numStr] = {
      estado: 'reserved',
      participante: {
        nombre,
        documento,
        numDoc: documento,
        tipoDoc,
        telefono,
        referenciaPago,
        curso: curso || 'N/A',
        carrera: curso || 'N/A',
        grupo: curso || 'N/A',
        email,
        fechaReserva: new Date().toISOString()
      }
    };

    await saveRegistro('numeros', numeros);

    return res.status(200).json({
      success: true,
      mensaje: `Número ${numStr} seleccionado exitosamente.`,
      numero: numStr,
      datos: numeros[numStr]
    });
  } catch (error) {
    console.error('Error en /api/reservar:', error);
    return res.status(500).json({ success: false, error: 'Error del servidor al registrar la selección.' });
  }
};
