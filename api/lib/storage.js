const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('./crypto');

// Directorio fallback para archivos locales /tmp en Serverless
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', '..', '.data');
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const FILES = {
  usuarios: 'usuarios.enc.txt',
  numeros: 'rifa_numeros.enc.txt',
  admin: 'admin_config.enc.txt'
};

// Intenta inicializar Vercel KV si están las credenciales
let kv = null;
try {
  if (process.env.KV_REST_API_URL || process.env.KV_URL) {
    const { createClient } = require('@vercel/kv');
    kv = createClient({
      url: process.env.KV_REST_API_URL || process.env.KV_URL,
      token: process.env.KV_REST_API_TOKEN
    });
  }
} catch (e) {
  kv = null;
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

// ─── LECTURA CENTRALIZADA ──────────────────────────────────────────
async function getRegistro(tipo) {
  let encryptedText = null;

  // 1. Intentar desde Vercel KV
  if (kv) {
    try {
      encryptedText = await kv.get(`rifa:${tipo}`);
    } catch (e) {
      console.warn('Error leyendo de Vercel KV, usando archivo:', e.message);
    }
  }

  // 2. Fallback a archivo cifrado
  if (!encryptedText) {
    const filePath = path.join(DATA_DIR, FILES[tipo]);
    if (fs.existsSync(filePath)) {
      encryptedText = fs.readFileSync(filePath, 'utf8');
    }
  }

  // Si no existe, retornar el estado inicial por defecto
  if (!encryptedText) {
    if (tipo === 'usuarios') return {};
    if (tipo === 'numeros') return getInitialNumeros();
    if (tipo === 'admin') return getInitialAdminConfig();
  }

  const decrypted = decrypt(encryptedText);
  if (!decrypted) {
    if (tipo === 'usuarios') return {};
    if (tipo === 'numeros') return getInitialNumeros();
    if (tipo === 'admin') return getInitialAdminConfig();
  }

  try {
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Error parseando JSON de registro:', e.message);
    return null;
  }
}

// ─── ESCRITURA CENTRALIZADA ────────────────────────────────────────
async function saveRegistro(tipo, data) {
  const jsonStr = JSON.stringify(data);
  const encryptedText = encrypt(jsonStr);

  // 1. Guardar en Vercel KV si está activo
  if (kv) {
    try {
      await kv.set(`rifa:${tipo}`, encryptedText);
    } catch (e) {
      console.warn('Error escribiendo en Vercel KV, guardando en archivo:', e.message);
    }
  }

  // 2. Guardar en archivo local cifrado
  const filePath = path.join(DATA_DIR, FILES[tipo]);
  fs.writeFileSync(filePath, encryptedText, 'utf8');
  return true;
}

module.exports = {
  getRegistro,
  saveRegistro,
  getInitialNumeros,
  getInitialAdminConfig
};
