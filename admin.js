// =========================================
//  PANEL DE ADMINISTRACIÓN — admin.js (Conectado a /api/admin)
// =========================================

const FRASE_ELIMINACION_EXACTA = 'ELIMINAR RIFA ACTUAL';

let numeros = {};
let premioData = {};
let adminCreds = {
  user: '',
  password: ''
};

// ─── MODALES Y TOAST ────────────────────────────────────────────────
const modalConfirmarEliminacion = new bootstrap.Modal(document.getElementById('modalConfirmarEliminacion'));
const adminToast                = new bootstrap.Toast(document.getElementById('adminToast'));

function notificar(msg) {
  document.getElementById('adminToastMsg').textContent = msg;
  adminToast.show();
}

// ─── CARGAR DATOS DESDE EL SERVIDOR (/api/admin) ───────────────────
async function cargarDatosServidor() {
  if (!adminCreds.user || !adminCreds.password) return;

  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getData',
        user: adminCreds.user,
        password: adminCreds.password
      })
    });

    const data = await res.json();
    if (data.success) {
      numeros = data.numeros || {};
      premioData = data.config || {};
      renderKPIs();
      renderTablaNumeros();
      cargarFormularioConfig();
    } else {
      notificar(data.error || 'Sesión no válida.');
      cerrarSesionAdmin();
    }
  } catch (err) {
    notificar('Error de conexión al cargar datos de administración.');
  }
}

// ─── AUTENTICACIÓN ADMIN ────────────────────────────────────────────
function verificarSesionAdmin() {
  const guardado = sessionStorage.getItem('adminCreds');
  if (guardado) {
    try {
      adminCreds = JSON.parse(guardado);
      if (adminCreds.user && adminCreds.password) {
        mostrarDashboard();
        cargarDatosServidor();
        return;
      }
    } catch (e) {}
  }
  mostrarLogin();
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
}

function cerrarSesionAdmin() {
  sessionStorage.removeItem('adminCreds');
  adminCreds = { user: '', password: '' };
  mostrarLogin();
}

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const u = document.getElementById('adminUserInput').value.trim();
  const p = document.getElementById('adminPassInput').value.trim();
  const errBox = document.getElementById('adminLoginError');
  errBox.classList.add('d-none');

  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', user: u, password: p })
    });

    const data = await res.json();
    if (data.success) {
      adminCreds = { user: u, password: p };
      sessionStorage.setItem('adminCreds', JSON.stringify(adminCreds));
      mostrarDashboard();
      await cargarDatosServidor();
      notificar('¡Bienvenido al Panel de Administración!');
    } else {
      errBox.textContent = data.error || 'Credenciales incorrectas.';
      errBox.classList.remove('d-none');
    }
  } catch (err) {
    errBox.textContent = 'Error de conexión con el servidor.';
    errBox.classList.remove('d-none');
  }
});

document.getElementById('btnAdminLogout').addEventListener('click', () => {
  cerrarSesionAdmin();
  notificar('Sesión de administrador finalizada.');
});

// ─── KPI CARDS ──────────────────────────────────────────────────────
function renderKPIs() {
  let disp = 0, res = 0, pag = 0;
  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    const n = numeros[numStr] || { estado: 'available' };
    if (n.estado === 'available') disp++;
    else if (n.estado === 'reserved') res++;
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

    // Filtro Texto
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

    const partNombre = p ? `<strong class="text-dark">${p.nombre}</strong>` : `<span class="text-muted small">— Disponible —</span>`;
    const partDoc    = p ? `<span class="small">${p.tipoDoc}: ${p.numDoc}</span>` : `<span class="text-muted small">—</span>`;
    const partCont   = p ? `<div class="small">${p.telefono || '—'}</div><div class="text-muted small">${p.email || ''}</div>` : `<span class="text-muted small">—</span>`;
    const partAcad   = p ? `<div class="small fw-semibold">${p.carrera || '—'}</div><div class="text-muted small">Grupo: ${p.grupo || '—'}</div>` : `<span class="text-muted small">—</span>`;

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
    b.addEventListener('click', async (e) => {
      const numStr = e.currentTarget.dataset.num;
      const nuevo  = e.currentTarget.dataset.nuevo;
      await cambiarEstadoNumero(numStr, nuevo);
    });
  });

  tbody.querySelectorAll('.btn-liberar-admin').forEach(b => {
    b.addEventListener('click', async (e) => {
      const numStr = e.currentTarget.dataset.num;
      await liberarNumeroAdmin(numStr);
    });
  });
}

async function cambiarEstadoNumero(numStr, nuevoEstado) {
  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cambiarEstado',
        user: adminCreds.user,
        password: adminCreds.password,
        numero: numStr,
        nuevoEstado
      })
    });

    const data = await res.json();
    if (data.success) {
      notificar(`Número ${numStr} cambiado a: ${nuevoEstado === 'sold' ? 'PAGADO' : 'PENDIENTE'}`);
      await cargarDatosServidor();
    } else {
      notificar(data.error || 'Error al cambiar estado.');
    }
  } catch (err) {
    notificar('Error de conexión.');
  }
}

async function liberarNumeroAdmin(numStr) {
  if (!confirm(`¿Deseas liberar el número ${numStr}? El registro actual del participante será eliminado y el número quedará disponible.`)) {
    return;
  }

  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'liberarAdmin',
        user: adminCreds.user,
        password: adminCreds.password,
        numero: numStr
      })
    });

    const data = await res.json();
    if (data.success) {
      notificar(`Número ${numStr} liberado.`);
      await cargarDatosServidor();
    } else {
      notificar(data.error || 'Error al liberar número.');
    }
  } catch (err) {
    notificar('Error de conexión.');
  }
}

document.getElementById('filtroTexto').addEventListener('input', renderTablaNumeros);
document.getElementById('filtroEstado').addEventListener('change', renderTablaNumeros);

// ─── EXPORTAR A EXCEL / CSV ─────────────────────────────────────────
document.getElementById('btnExportarExcel').addEventListener('click', () => {
  let csvContent = '\uFEFF';
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
  document.getElementById('cfgPremioNombre').value = premioData.nombrePremio || '';
  document.getElementById('cfgPremioDesc').value   = premioData.descPremio || '';
  document.getElementById('cfgFechaSorteo').value  = premioData.fechaSorteo || '';
  document.getElementById('cfgCondiciones').value  = premioData.condicionesSorteo || '';
  document.getElementById('cfgDetalles').value     = (premioData.detallesPremio || []).join('\n');
  renderPreviewImagenes();
}

document.getElementById('formConfigRifa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nuevoPremio = {
    nombre: document.getElementById('cfgPremioNombre').value.trim(),
    desc: document.getElementById('cfgPremioDesc').value.trim(),
    fechaSorteo: document.getElementById('cfgFechaSorteo').value.trim(),
    condicionesSorteo: document.getElementById('cfgCondiciones').value.trim(),
    detalles: document.getElementById('cfgDetalles').value
                .split('\n').map(d => d.trim()).filter(d => d.length > 0),
    imagenes: premioData.imagenes || []
  };

  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'guardarConfig',
        user: adminCreds.user,
        password: adminCreds.password,
        premio: nuevoPremio
      })
    });

    const data = await res.json();
    if (data.success) {
      notificar('Información de la rifa actualizada en el servidor.');
      await cargarDatosServidor();
    } else {
      notificar(data.error || 'Error al guardar configuración.');
    }
  } catch (err) {
    notificar('Error de conexión.');
  }
});

// Subida de imágenes
document.getElementById('cfgInputImagenes').addEventListener('change', function () {
  const files = Array.from(this.files).slice(0, 3);
  if (files.length === 0) return;

  const readers = files.map(file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  }));

  Promise.all(readers).then(async base64Array => {
    premioData.imagenes = base64Array;

    const nuevoPremio = {
      nombre: document.getElementById('cfgPremioNombre').value.trim(),
      desc: document.getElementById('cfgPremioDesc').value.trim(),
      fechaSorteo: document.getElementById('cfgFechaSorteo').value.trim(),
      condicionesSorteo: document.getElementById('cfgCondiciones').value.trim(),
      detalles: (document.getElementById('cfgDetalles').value || '').split('\n').filter(Boolean),
      imagenes: base64Array
    };

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'guardarConfig',
          user: adminCreds.user,
          password: adminCreds.password,
          premio: nuevoPremio
        })
      });

      const data = await res.json();
      if (data.success) {
        notificar('Imágenes del premio actualizadas en el servidor.');
        renderPreviewImagenes();
      }
    } catch (err) {
      notificar('Error al guardar imágenes.');
    }
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

document.getElementById('btnBorrarImagenes').addEventListener('click', async () => {
  if (confirm('¿Deseas quitar todas las imágenes del premio?')) {
    premioData.imagenes = [];
    const nuevoPremio = {
      nombre: premioData.nombrePremio,
      desc: premioData.descPremio,
      fechaSorteo: premioData.fechaSorteo,
      condicionesSorteo: premioData.condicionesSorteo,
      detalles: premioData.detallesPremio || [],
      imagenes: []
    };

    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'guardarConfig',
          user: adminCreds.user,
          password: adminCreds.password,
          premio: nuevoPremio
        })
      });
      renderPreviewImagenes();
      notificar('Imágenes eliminadas.');
    } catch (err) {
      notificar('Error al eliminar imágenes.');
    }
  }
});

// ─── ZONA DE PELIGRO: REINICIAR RIFA (/api/admin) ───────────────────
document.getElementById('btnIniciarNuevaRifa').addEventListener('click', () => {
  document.getElementById('inputFraseConfirmacion').value = '';
  document.getElementById('errorFraseConfirmacion').classList.add('d-none');
  modalConfirmarEliminacion.show();
});

document.getElementById('btnConfirmarEliminacionDefinitiva').addEventListener('click', async () => {
  const entrada = document.getElementById('inputFraseConfirmacion').value.trim();
  const errBox  = document.getElementById('errorFraseConfirmacion');

  if (entrada !== FRASE_ELIMINACION_EXACTA) {
    errBox.classList.remove('d-none');
    return;
  }

  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reiniciarRifa',
        user: adminCreds.user,
        password: adminCreds.password,
        frase: entrada
      })
    });

    const data = await res.json();
    if (data.success) {
      modalConfirmarEliminacion.hide();
      await cargarDatosServidor();
      notificar('🎉 ¡Rifa reiniciada en el servidor! Todos los 100 números están libres.');
    } else {
      errBox.textContent = data.error || 'Error al reiniciar la rifa.';
      errBox.classList.remove('d-none');
    }
  } catch (err) {
    errBox.textContent = 'Error de conexión con el servidor.';
    errBox.classList.remove('d-none');
  }
});

// ─── INIT ────────────────────────────────────────────────────────────
verificarSesionAdmin();

// Refresco periódico del admin cada 15 segundos
setInterval(() => {
  if (adminCreds.user && adminCreds.password) {
    cargarDatosServidor();
  }
}, 15000);
