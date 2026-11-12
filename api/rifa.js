const { getRegistro } = require('./lib/storage');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const adminConfig = await getRegistro('admin');
    const numeros = await getRegistro('numeros');

    // Por seguridad, para el público sanitizamos la clave del admin
    const publicConfig = {
      nombrePremio: adminConfig.nombrePremio || 'Premio Principal',
      descPremio: adminConfig.descPremio || '',
      detallesPremio: adminConfig.detallesPremio || [],
      imagenes: (adminConfig.imagenes || []).slice(0, 3),
      fechaSorteo: adminConfig.fechaSorteo || 'Por definir',
      condicionesSorteo: adminConfig.condicionesSorteo || ''
    };

    return res.status(200).json({
      success: true,
      config: publicConfig,
      numeros: numeros || {}
    });
  } catch (error) {
    console.error('Error en /api/rifa:', error);
    return res.status(500).json({ success: false, error: 'Error del servidor al obtener datos de la rifa.' });
  }
};
