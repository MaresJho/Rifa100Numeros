const { Redis } = require('@upstash/redis');
const { encrypt, decrypt } = require('./crypto');

// Detectar automáticamente variables de Vercel (tanto KV_REST_API_* como UPSTASH_REDIS_REST_*)
const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
if (url && token) {
  try {
    redis = new Redis({ url, token });
    console.log('[STORAGE] Conectado exitosamente a Upstash Redis con URL:', url);
  } catch (err) {
    console.error('[STORAGE] Error inicializando Upstash Redis client:', err.message);
  }
} else {
  console.warn('[STORAGE] ADVERTENCIA: No se detectaron KV_REST_API_URL / TOKEN en las variables de entorno.');
}

// ─── Estructuras iniciales por defecto ──────────────────────────────
function getInitialNumeros() {
  const nums = {};
  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    nums[numStr] = { estado: 'available', participante: null };
  }
  return nums;
}

function getInitialAdminConfig() {
  return {
    adminUser: process.env.ADMIN_USER || 'Administrador',
    adminPassword: process.env.ADMIN_PASSWORD || 'Americana2026',
    nombrePremio: '🎁 Premio Principal',
    descPremio: 'Aquí va la descripción del premio configurada por el administrador.',
    detallesPremio: ['Sorteo oficial', 'Entrega inmediata'],
    imagenes: [],
    fechaSorteo: '30 de Noviembre de 2026',
    condicionesSorteo: 'Juega con los dos últimos números de la Lotería de Cundinamarca (sorteo de la noche).'
  };
}

// ─── LECTURA CENTRALIZADA DESDE UPSTASH ────────────────────────────
async function getRegistro(tipo) {
  const key = `rifa_db:${tipo}`;

  if (redis) {
    try {
      const encryptedText = await redis.get(key);
      if (encryptedText) {
        const decrypted = decrypt(encryptedText);
        if (decrypted) {
          return JSON.parse(decrypted);
        }
      }
    } catch (err) {
      console.error(`[STORAGE] Error leyendo ${key} de Redis:`, err.message);
    }
  }

  // Fallback con valores iniciales
  if (tipo === 'usuarios') return {};
  if (tipo === 'numeros') return getInitialNumeros();
  if (tipo === 'admin') return getInitialAdminConfig();
}

// ─── ESCRITURA CENTRALIZADA EN UPSTASH ─────────────────────────────
async function saveRegistro(tipo, data) {
  const key = `rifa_db:${tipo}`;
  const jsonStr = JSON.stringify(data);
  const encryptedText = encrypt(jsonStr);

  if (redis) {
    try {
      await redis.set(key, encryptedText);
      console.log(`[STORAGE] Registro ${key} guardado exitosamente en Upstash.`);
      return true;
    } catch (err) {
      console.error(`[STORAGE] Error guardando ${key} en Redis:`, err.message);
      return false;
    }
  }

  console.warn(`[STORAGE] No se pudo guardar ${key} porque no hay cliente Redis activo.`);
  return false;
}

module.exports = {
  getRegistro,
  saveRegistro,
  getInitialNumeros,
  getInitialAdminConfig
};
