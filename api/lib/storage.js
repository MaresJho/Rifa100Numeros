const { encrypt, decrypt } = require('./crypto');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Personal Access Token de GitHub
const GITHUB_REPO  = process.env.GITHUB_REPO || 'MaresJho/Rifa100Numeros';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

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

// ─── LECTURA DESDE GITHUB API ──────────────────────────────────────
async function getRegistro(tipo) {
  const path = `data/${tipo}.enc.txt`;

  if (!GITHUB_TOKEN) {
    console.warn(`[STORAGE] GITHUB_TOKEN no configurado. Usando estado inicial para: ${tipo}`);
    if (tipo === 'usuarios') return {};
    if (tipo === 'numeros') return getInitialNumeros();
    if (tipo === 'admin') return getInitialAdminConfig();
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RifaVirtual-App'
      }
    });

    if (res.status === 404) {
      if (tipo === 'usuarios') return {};
      if (tipo === 'numeros') return getInitialNumeros();
      if (tipo === 'admin') return getInitialAdminConfig();
    }

    if (!res.ok) {
      console.error(`[STORAGE] Error leyendo ${path} de GitHub: ${res.status}`);
      if (tipo === 'usuarios') return {};
      if (tipo === 'numeros') return getInitialNumeros();
      if (tipo === 'admin') return getInitialAdminConfig();
    }

    const data = await res.json();
    const encryptedText = Buffer.from(data.content, 'base64').toString('utf8');

    const decrypted = decrypt(encryptedText);
    if (!decrypted) {
      if (tipo === 'usuarios') return {};
      if (tipo === 'numeros') return getInitialNumeros();
      if (tipo === 'admin') return getInitialAdminConfig();
    }

    return JSON.parse(decrypted);
  } catch (err) {
    console.error(`[STORAGE] Excepción leyendo ${tipo}:`, err.message);
    if (tipo === 'usuarios') return {};
    if (tipo === 'numeros') return getInitialNumeros();
    if (tipo === 'admin') return getInitialAdminConfig();
  }
}

// ─── ESCRITURA EN GITHUB API (COMMIT ATÓMICO) ──────────────────────
async function saveRegistro(tipo, data) {
  const path = `data/${tipo}.enc.txt`;

  if (!GITHUB_TOKEN) {
    console.warn(`[STORAGE] No se puede guardar en GitHub porque GITHUB_TOKEN no está definido.`);
    return false;
  }

  try {
    const jsonStr = JSON.stringify(data);
    const encryptedText = encrypt(jsonStr);
    const contentBase64 = Buffer.from(encryptedText).toString('base64');

    // 1. Obtener el SHA actual del archivo si existe (necesario para actualizar en GitHub)
    let sha = null;
    const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
    const getRes = await fetch(getUrl, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RifaVirtual-App'
      }
    });

    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    // 2. Crear o actualizar el archivo cifrado
    const putUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
    const body = {
      message: `chore(data): update encrypted ${tipo} state [skip ci]`,
      content: contentBase64,
      branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'RifaVirtual-App'
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const errTxt = await putRes.text();
      console.error(`[STORAGE] Error escribiendo en GitHub: ${putRes.status}`, errTxt);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[STORAGE] Excepción guardando ${tipo}:`, err.message);
    return false;
  }
}

module.exports = {
  getRegistro,
  saveRegistro,
  getInitialNumeros,
  getInitialAdminConfig
};
