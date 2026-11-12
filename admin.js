// =========================================
//  PANEL DE ADMINISTRACIÓN — admin.js
// =========================================

const FRASE_ELIMINACION_EXACTA = 'ELIMINAR RIFA ACTUAL';

// ─── ESTADO LOCAL DE DATOS ──────────────────────────────────────────
let numeros = {};
for (let i = 0; i < 100; i++) {
  const numStr = String(i).padStart(2, '0');
  numeros[numStr] = { estado: 'available', participante: null };
}

let premioData = {
  nombre: 'Premio Principal',
  desc: 'Pronto se publicarán los detalles del premio.',
  detalles: [],
  imagenes: [],
  fechaSorteo: '30 de Noviembre de 2026',
  condicionesSorteo: 'Juega con los dos últimos números de la Lotería de Cundinamarca (sorteo de la noche).'
};

// Credenciales oficiales de administración
let adminConfig = {
  usuario: 'Administrador',
  password: 'Americana2026'
};

let adminAutenticado = false;

// ─── MODALES Y TOAST ────────────────────────────────────────────────
const modalConfirmarEliminacion = new bootstrap.Modal(document.getElementById('modalConfirmarEliminacion'));
const adminToast                = new bootstrap.Toast(document.getElementById('adminToast'));

function notificar(msg) {
  document.getElementById('adminToastMsg').textContent = msg;
  adminToast.show();
}

// ─── CARGAR DATOS DESDE LOCALSTORAGE ────────────────────────────────
function cargarDatos() {
  const guardadoNumeros = localStorage.getItem('rifaNumeros');
  if (guardadoNumeros) {
    try {
      const parsed = JSON.parse(guardadoNumeros);
      for (let i = 0; i < 100; i++) {
        const numStr = String(i).padStart(2, '0');
        if (parsed[numStr]) {
          numeros[numStr] = parsed[numStr];
        } else if (parsed[i]) {
          numeros[numStr] = parsed[i];
        }
      }
    } catch (e) {
      console.warn('Error leyendo rifaNumeros:', e);
    }
  }

  const guardadoPremio = localStorage.getItem('rifaPremio');
  if (guardadoPremio) {
    try {
      const parsed = JSON.parse(guardadoPremio);
      premioData = {
        nombre: parsed.nombre || 'Premio Principal',
        desc: parsed.desc || 'Pronto se publicarán los detalles del premio.',
        detalles: Array.isArray(parsed.detalles) ? parsed.detalles : [],
        imagenes: Array.isArray(parsed.imagenes) ? parsed.imagenes.slice(0, 3) : [],
        fechaSorteo: parsed.fechaSorteo || '30 de Noviembre de 2026',
        condicionesSorteo: parsed.condicionesSorteo || 'Juega con las dos últimas cifras de la lotería oficial.'
      };
    } catch (e) {
      console.warn('Error leyendo rifaPremio:', e);
    }
  }

  const guardadoAdmin = localStorage.getItem('rifaAdminConfig');
  if (guardadoAdmin) {
    try {
      const parsed = JSON.parse(guardadoAdmin);
      if (parsed.usuario && parsed.password) {
        adminConfig = parsed;
      }
    } catch (e) {}
  }
}

function guardarNumeros() {
  localStorage.setItem('rifaNumeros', JSON.stringify(numeros));
}

function guardarPremio() {
  localStorage.setItem('rifaPremio', JSON.stringify(premioData));
}

// ─── AUTENTICACIÓN ADMIN ────────────────────────────────────────────
function verificarSesionAdmin() {
  const sesion = sessionStorage.getItem('adminAutenticado');
  if (sesion === 'true') {
    adminAutenticado = true;
    mostrarDashboard();
  } else {
    adminAutenticado = false;
    mostrarLogin();
  }
}

function mostrarLogin() {
  document.getElementById('adminLoginSection').classList.remove('d-none');
  document.getElementById('adminDashboardSection').classList.add('d-none');
  document.getElementById('btnAdminLogout').classList.add('d-none');
}

function mostrarDashboard() {
  document.getElementById('adminLoginSection').classList.add('d-none');
  document.getElementById('adminDashboardSection').classList.remove('d-none');
  document.getElementById('btnAdminLogout').classList.remove('d-none');
  renderKPIs();
  renderTablaNumeros();
  cargarFormularioConfig();
}

document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = document.getElementById('adminUserInput').value.trim();
  const p = document.getElementById('adminPassInput').value.trim();
  const errBox = document.getElementById('adminLoginError');

  if (u === adminConfig.usuario && p === adminConfig.password) {
    sessionStorage.setItem('adminAutenticado', 'true');
    adminAutenticado = true;
    errBox.classList.add('d-none');
    mostrarDashboard();
    notificar('¡Bienvenido al Panel de Administración!');
  } else {
    errBox.textContent = 'Usuario o contraseña de administrador incorrectos.';
    errBox.classList.remove('d-none');
  }
});

document.getElementById('btnAdminLogout').addEventListener('click', () => {
  sessionStorage.removeItem('adminAutenticado');
  adminAutenticado = false;
  mostrarLogin();
  notificar('Sesión de administrador finalizada.');
});

// ─── KPI CARDS ──────────────────────────────────────────────────────
function renderKPIs() {
  let disp = 0, res = 0, pag = 0;
  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    if (numeros[numStr].estado === 'available') disp++;
    else if (numeros[numStr].estado === 'reserved') res++;
    else pag++;
  }

  document.getElementById('kpiDisponibles').textContent = disp;
  document.getElementById('kpiReservados').textContent  = res;
  document.getElementById('kpiPagados').textContent     = pag;
}

// ─── TABLA DE CONTROL DE NÚMEROS Y FILTROS DINÁMICOS ───────────────
function renderTablaNumeros() {
  const tbody = document.getElementById('tablaAdminNumerosTbody');
  const filtroTxt = (document.getElementById('filtroTexto').value || '').toLowerCase().trim();
  const filtroEst = document.getElementById('filtroEstado').value;

  tbody.innerHTML = '';
  let countFiltrados = 0;

  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    const item = numeros[numStr] || { estado: 'available', participante: null };
    const p = item.participante;

    // Filtro Estado
    if (filtroEst !== 'todos' && item.estado !== filtroEst) {
      continue;
    }

    // Filtro Texto (número, nombre, documento, carrera)
    if (filtroTxt) {
      const matchNum = numStr.includes(filtroTxt);
      const matchNom = p && p.nombre ? p.nombre.toLowerCase().includes(filtroTxt) : false;
      const matchDoc = p && p.numDoc ? p.numDoc.toLowerCase().includes(filtroTxt) : false;
      const matchCar = p && p.carrera ? p.carrera.toLowerCase().includes(filtroTxt) : false;

      if (!matchNum && !matchNom && !matchDoc && !matchCar) {
        continue;
      }
    }

    countFiltrados++;
    const tr = document.createElement('tr');

    // Badge Estado
    let badgeEstado = '';
    if (item.estado === 'available') {
      badgeEstado = `<span class="badge bg-success-subtle text-success border border-success-subtle badge-status">🟢 Disponible</span>`;
    } else if (item.estado === 'reserved') {
      badgeEstado = `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle badge-status">🟡 Reservado (Pendiente)</span>`;
    } else {
      badgeEstado = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle badge-status">🔴 Pagado (Vendido)</span>`;
    }

    // Datos Participante
    const partNombre = p ? `<strong class="text-dark">${p.nombre}</strong>` : `<span class="text-muted small">— Disponible —</span>`;
    const partDoc    = p ? `<span class="small">${p.tipoDoc}: ${p.numDoc}</span>` : `<span class="text-muted small">—</span>`;
    const partCont   = p ? `<div class="small">${p.telefono || '—'}</div><div class="text-muted small">${p.email || ''}</div>` : `<span class="text-muted small">—</span>`;
    const partAcad   = p ? `<div class="small fw-semibold">${p.carrera || '—'}</div><div class="text-muted small">Grupo: ${p.grupo || '—'}</div>` : `<span class="text-muted small">—</span>`;

    // Botones de acción del administrador
    let botonesAccion = '';

    if (item.estado === 'reserved') {
      botonesAccion = `
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-success btn-cambiar-estado" data-num="${numStr}" data-nuevo="sold" title="Confirmar pago recibido">
            <i class="bi bi-check2-circle me-1"></i>Marcar Pagado
          </button>
          <button type="button" class="btn btn-outline-danger btn-liberar-admin" data-num="${numStr}" title="Cancelar reserva y liberar">
            <i class="bi bi-trash"></i>
          </button>
        </div>`;
    } else if (item.estado === 'sold') {
      botonesAccion = `
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-outline-warning btn-cambiar-estado" data-num="${numStr}" data-nuevo="reserved" title="Regresar a pendiente de pago">
            <i class="bi bi-arrow-counterclockwise me-1"></i>A Pendiente
          </button>
          <button type="button" class="btn btn-outline-danger btn-liberar-admin" data-num="${numStr}" title="Liberar número completamente">
            <i class="bi bi-trash"></i>
          </button>
        </div>`;
    } else {
      botonesAccion = `<span class="text-muted small fst-italic">Sin asignar</span>`;
    }

    tr.innerHTML = `
      <td><span class="num-tag-badge">${numStr}</span></td>
      <td>${badgeEstado}</td>
      <td>${partNombre}</td>
      <td>${partDoc}</td>
      <td>${partCont}</td>
      <td>${partAcad}</td>
      <td class="text-end">${botonesAccion}</td>
    `;

    tbody.appendChild(tr);
  }

  document.getElementById('lblCantFiltrados').textContent = countFiltrados;

  tbody.querySelectorAll('.btn-cambiar-estado').forEach(b => {
    b.addEventListener('click', (e) => {
      const numStr = e.currentTarget.dataset.num;
      const nuevo  = e.currentTarget.dataset.nuevo;
      cambiarEstadoNumero(numStr, nuevo);
    });
  });

  tbody.querySelectorAll('.btn-liberar-admin').forEach(b => {
    b.addEventListener('click', (e) => {
      const numStr = e.currentTarget.dataset.num;
      liberarNumeroAdmin(numStr);
    });
  });
}

function cambiarEstadoNumero(numStr, nuevoEstado) {
  if (!numeros[numStr]) return;
  numeros[numStr].estado = nuevoEstado;
  guardarNumeros();
  renderKPIs();
  renderTablaNumeros();
  notificar(`Número ${numStr} cambiado a: ${nuevoEstado === 'sold' ? 'PAGADO' : 'PENDIENTE'}`);
}

function liberarNumeroAdmin(numStr) {
  if (!confirm(`¿Deseas liberar el número ${numStr}? El registro actual del participante será eliminado y el número quedará disponible.`)) {
    return;
  }
  numeros[numStr] = { estado: 'available', participante: null };
  guardarNumeros();
  renderKPIs();
  renderTablaNumeros();
  notificar(`Número ${numStr} liberado exitosamente.`);
}

document.getElementById('filtroTexto').addEventListener('input', renderTablaNumeros);
document.getElementById('filtroEstado').addEventListener('change', renderTablaNumeros);

// ─── EXPORTAR A EXCEL / CSV ─────────────────────────────────────────
document.getElementById('btnExportarExcel').addEventListener('click', () => {
  let csvContent = '\uFEFF'; // BOM para que Excel lea caracteres en español (tildes, ñ)
  csvContent += 'Numero,Estado,Nombre,TipoDocumento,NumeroDocumento,Telefono,Email,Carrera,Grupo\n';

  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    const n = numeros[numStr] || { estado: 'available', participante: null };
    const p = n.participante || {};

    const estadoTexto = n.estado === 'sold' ? 'Pagado' : (n.estado === 'reserved' ? 'Reservado' : 'Disponible');
    const nombre = (p.nombre || '').replace(/"/g, '""');
    const tipoDoc = p.tipoDoc || '';
    const numDoc = p.numDoc || '';
    const tel = p.telefono || '';
    const email = p.email || '';
    const carrera = (p.carrera || '').replace(/"/g, '""');
    const grupo = (p.grupo || '').replace(/"/g, '""');

    csvContent += `"${numStr}","${estadoTexto}","${nombre}","${tipoDoc}","${numDoc}","${tel}","${email}","${carrera}","${grupo}"\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte_RifaVirtual_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  notificar('Reporte Excel / CSV descargado.');
});

// ─── CONFIGURACIÓN DE LA RIFA (PREMIO, FECHA, LOTERÍA, IMÁGENES) ────
function cargarFormularioConfig() {
  document.getElementById('cfgPremioNombre').value = premioData.nombre || '';
  document.getElementById('cfgPremioDesc').value   = premioData.desc || '';
  document.getElementById('cfgFechaSorteo').value  = premioData.fechaSorteo || '';
  document.getElementById('cfgCondiciones').value  = premioData.condicionesSorteo || '';
  document.getElementById('cfgDetalles').value     = (premioData.detalles || []).join('\n');
  renderPreviewImagenes();
}

document.getElementById('formConfigRifa').addEventListener('submit', (e) => {
  e.preventDefault();
  premioData.nombre            = document.getElementById('cfgPremioNombre').value.trim();
  premioData.desc              = document.getElementById('cfgPremioDesc').value.trim();
  premioData.fechaSorteo       = document.getElementById('cfgFechaSorteo').value.trim();
  premioData.condicionesSorteo = document.getElementById('cfgCondiciones').value.trim();
  premioData.detalles          = document.getElementById('cfgDetalles').value
                                    .split('\n').map(d => d.trim()).filter(d => d.length > 0);

  guardarPremio();
  notificar('Información de la rifa actualizada correctamente.');
});

// Manejo de hasta 3 imágenes
document.getElementById('cfgInputImagenes').addEventListener('change', function () {
  const files = Array.from(this.files).slice(0, 3);
  if (files.length === 0) return;

  const readers = files.map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  }));

  Promise.all(readers).then(base64Array => {
    premioData.imagenes = base64Array;
    guardarPremio();
    renderPreviewImagenes();
    notificar('Imágenes del premio actualizadas.');
  });

  this.value = '';
});

function renderPreviewImagenes() {
  const container = document.getElementById('cfgPreviewImagenes');
  const btnBorrar = document.getElementById('btnBorrarImagenes');
  container.innerHTML = '';

  const imgs = premioData.imagenes || [];
  if (imgs.length === 0) {
    container.innerHTML = `<div class="col-12 text-muted small fst-italic">No hay imágenes cargadas actualmente.</div>`;
    btnBorrar.classList.add('d-none');
    return;
  }

  btnBorrar.classList.remove('d-none');

  imgs.forEach((src, idx) => {
    const col = document.createElement('div');
    col.className = 'col-4';
    col.innerHTML = `
      <div class="card border rounded-3 overflow-hidden shadow-sm">
        <img src="${src}" class="w-100" style="height: 100px; object-fit: cover;" alt="Foto ${idx+1}"/>
        <div class="card-footer bg-light p-1 text-center small text-muted">Foto ${idx+1}</div>
      </div>
    `;
    container.appendChild(col);
  });
}

document.getElementById('btnBorrarImagenes').addEventListener('click', () => {
  if (confirm('¿Deseas quitar todas las imágenes del premio?')) {
    premioData.imagenes = [];
    guardarPremio();
    renderPreviewImagenes();
    notificar('Imágenes eliminadas.');
  }
});

// ─── ZONA DE PELIGRO: CREAR NUEVA RIFA (CONFIRMACIÓN ESTRICTA) ─────
document.getElementById('btnIniciarNuevaRifa').addEventListener('click', () => {
  document.getElementById('inputFraseConfirmacion').value = '';
  document.getElementById('errorFraseConfirmacion').classList.add('d-none');
  modalConfirmarEliminacion.show();
});

document.getElementById('btnConfirmarEliminacionDefinitiva').addEventListener('click', () => {
  const entrada = document.getElementById('inputFraseConfirmacion').value.trim();
  const errBox  = document.getElementById('errorFraseConfirmacion');

  if (entrada !== FRASE_ELIMINACION_EXACTA) {
    errBox.classList.remove('d-none');
    return;
  }

  // Reiniciar todos los 100 números (00 al 99)
  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    numeros[numStr] = { estado: 'available', participante: null };
  }
  guardarNumeros();

  modalConfirmarEliminacion.hide();
  renderKPIs();
  renderTablaNumeros();
  notificar('🎉 ¡Rifa reiniciada! Los 100 números están disponibles para un nuevo sorteo.');
});

// ─── INIT ────────────────────────────────────────────────────────────
cargarDatos();
verificarSesionAdmin();
