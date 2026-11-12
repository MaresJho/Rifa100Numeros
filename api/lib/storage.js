const { encrypt, decrypt } = require('./crypto');

// Detectar credenciales de Upstash Redis (proporcionadas automáticamente por la integración de Vercel)
const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

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

// ─── LECTURA CENTRALIZADA (UPSTASH REDIS REST API) ─────────────────
async function getRegistro(tipo) {
  const key = `rifa:${tipo}`;

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const url = `${REDIS_URL}/get/${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });

      if (res.ok) {
        const json = await res.json();
        const encryptedText = json.result;

        if (encryptedText) {
          const decrypted = decrypt(encryptedText);
          if (decrypted) {
            return JSON.parse(decrypted);
          }
        }
      }
    } catch (err) {
      console.warn(`[UPSTASH] Error leyendo ${key}:`, err.message);
    }
  }

  // Fallback con datos por defecto si la base está recién creada o vacía
  if (tipo === 'usuarios') return {};
  if (tipo === 'numeros') return getInitialNumeros();
  if (tipo === 'admin') return getInitialAdminConfig();
}

// ─── ESCRITURA CENTRALIZADA (UPSTASH REDIS REST API) ────────────────
async function saveRegistro(tipo, data) {
  const key = `rifa:${tipo}`;
  const jsonStr = JSON.stringify(data);
  const encryptedText = encrypt(jsonStr);

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const url = `${REDIS_URL}/set/${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(encryptedText)
      });

      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.error(`[UPSTASH] Error guardando ${key}:`, err.message);
    }
  }

  return false;
}

module.exports = {
  getRegistro,
  saveRegistro,
  getInitialNumeros,
  getInitialAdminConfig
};
