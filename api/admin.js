const { getRegistro, saveRegistro, getInitialNumeros } = require('./lib/storage');

const FRASE_ELIMINACION_EXACTA = 'ELIMINAR RIFA ACTUAL';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido.' });
  }

  try {
    const { action, user, password } = req.body || {};
    const adminConfig = await getRegistro('admin');

    const adminUserMaster = process.env.ADMIN_USER || adminConfig.adminUser || 'Administrador';
    const adminPassMaster = process.env.ADMIN_PASSWORD || adminConfig.adminPassword || 'Americana2026';

    // ─── LOGIN ADMIN ─────────────────────────────────────────
    if (action === 'login') {
      if (user === adminUserMaster && password === adminPassMaster) {
        return res.status(200).json({ success: true, mensaje: 'Autenticado' });
      }
      return res.status(401).json({ success: false, error: 'Credenciales de administrador incorrectas.' });
    }

    // Para el resto de acciones, se requiere autenticación válida
    if (user !== adminUserMaster || password !== adminPassMaster) {
      return res.status(401).json({ success: false, error: 'No autorizado.' });
    }

    // ─── OBTENER DATOS COMPLETOS ADMIN ───────────────────────
    if (action === 'getData') {
      const numeros = await getRegistro('numeros');
      return res.status(200).json({
        success: true,
        config: adminConfig,
        numeros: numeros || {}
      });
    }

    // ─── CAMBIAR ESTADO DE NÚMERO (PAGADO / PENDIENTE) ───────
    if (action === 'cambiarEstado') {
      const { numero, nuevoEstado } = req.body;
      const numStr = String(numero).padStart(2, '0');
      const numeros = await getRegistro('numeros');

      if (!numeros[numStr]) {
        return res.status(400).json({ success: false, error: 'Número no válido.' });
      }

      numeros[numStr].estado = nuevoEstado;
      await saveRegistro('numeros', numeros);

      return res.status(200).json({ success: true, mensaje: `Número ${numStr} actualizado.` });
    }

    // ─── LIBERAR NÚMERO COMO ADMIN ───────────────────────────
    if (action === 'liberarAdmin') {
      const { numero } = req.body;
      const numStr = String(numero).padStart(2, '0');
      const numeros = await getRegistro('numeros');

      numeros[numStr] = { estado: 'available', participante: null };
      await saveRegistro('numeros', numeros);

      return res.status(200).json({ success: true, mensaje: `Número ${numStr} liberado.` });
    }

    // ─── GUARDAR CONFIGURACIÓN DEL PREMIO Y SORTEO ───────────
    if (action === 'guardarConfig') {
      const { premio } = req.body;
      if (!premio) {
        return res.status(400).json({ success: false, error: 'Datos de configuración incompletos.' });
      }

      adminConfig.nombrePremio       = premio.nombre || adminConfig.nombrePremio;
      adminConfig.descPremio         = premio.desc || adminConfig.descPremio;
      adminConfig.fechaSorteo        = premio.fechaSorteo || adminConfig.fechaSorteo;
      adminConfig.condicionesSorteo  = premio.condicionesSorteo || adminConfig.condicionesSorteo;
      adminConfig.detallesPremio     = Array.isArray(premio.detalles) ? premio.detalles : adminConfig.detallesPremio;
      if (Array.isArray(premio.imagenes)) {
        adminConfig.imagenes = premio.imagenes.slice(0, 3);
      }

      await saveRegistro('admin', adminConfig);

      return res.status(200).json({ success: true, mensaje: 'Configuración guardada.', config: adminConfig });
    }

    // ─── REINICIAR RIFA (CREAR NUEVA RIFA) ───────────────────
    if (action === 'reiniciarRifa') {
      const { frase } = req.body;
      if (frase !== FRASE_ELIMINACION_EXACTA) {
        return res.status(400).json({ success: false, error: 'La frase de confirmación no coincide exactamente.' });
      }

      const numerosLimpios = getInitialNumeros();
      await saveRegistro('numeros', numerosLimpios);

      return res.status(200).json({ success: true, mensaje: 'Rifa reiniciada exitosamente.' });
    }

    return res.status(400).json({ success: false, error: 'Acción no reconocida.' });
  } catch (error) {
    console.error('Error en /api/admin:', error);
    return res.status(500).json({ success: false, error: 'Error del servidor en el módulo admin.' });
  }
};
