// =========================================
//  RIFA VIRTUAL — app.js (Conectado a Backend /api)
// =========================================

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutos

// ─── ESTADO EN MEMORIA ──────────────────────────────────────────────
let numeros = {};
for (let i = 0; i < 100; i++) {
  const numStr = String(i).padStart(2, '0');
  numeros[numStr] = { estado: 'available', participante: null };
}

let premioData = {
  nombrePremio: '🎁 Premio Principal',
  descPremio: 'Pronto se publicarán los detalles del premio.',
  detallesPremio: [],
  imagenes: [],
  fechaSorteo: '30 de Noviembre de 2026',
  condicionesSorteo: 'Juega con los dos últimos números de la Lotería de Cundinamarca (sorteo de la noche).'
};

let usuarioActual = null;
let numeroSeleccionado = null;
let inactivityTimer = null;

// ─── REFERENCIAS A MODALES Y TOAST ──────────────────────────────────
const verPremioModal       = new bootstrap.Modal(document.getElementById('verPremioModal'));
const loginModal           = new bootstrap.Modal(document.getElementById('loginModal'));
const registroUsuarioModal = new bootstrap.Modal(document.getElementById('registroUsuarioModal'));
const registroModal        = new bootstrap.Modal(document.getElementById('registroModal'));
const confirmModal         = new bootstrap.Modal(document.getElementById('confirmModal'));
const misNumerosModal      = new bootstrap.Modal(document.getElementById('misNumerosModal'));
const sessionToast         = new bootstrap.Toast(document.getElementById('sessionToast'));

function mostrarNotificacion(mensaje) {
  document.getElementById('sessionToastMsg').textContent = mensaje;
  sessionToast.show();
}

// ─── SINCRONIZACIÓN CON EL SERVIDOR (/api/rifa) ────────────────────
async function cargarDatosServidor() {
  try {
    const res = await fetch('/api/rifa');
    if (!res.ok) throw new Error('Error al conectar con la API');
    const data = await res.json();

    if (data.success) {
      if (data.config) premioData = data.config;
      if (data.numeros) numeros = data.numeros;

      renderPremioVisual();
      renderGrid();
      actualizarMisNumerosBadge();
    }
  } catch (err) {
    console.warn('Usando estado local por fallo de red:', err.message);
  }
}

// ─── PREMIO E INFORMACIÓN DEL SORTEO ────────────────────────────────
function renderPremioVisual() {
  document.getElementById('premioNombreHero').textContent = premioData.nombrePremio || '🎁 Premio Principal';
  document.getElementById('verPremioModalLabel').textContent = premioData.nombrePremio || '🎁 Premio Principal';
  document.getElementById('premioNombreModal').textContent = premioData.nombrePremio || 'Premio Principal';
  document.getElementById('premioDescModal').textContent = premioData.descPremio || '';

  document.getElementById('sorteoFechaTexto').textContent = premioData.fechaSorteo || 'Por definir';
  document.getElementById('sorteoCondicionesTexto').textContent = premioData.condicionesSorteo || 'Por definir';

  const listaEl = document.getElementById('premioListaDetallesModal');
  const detallesEl = document.getElementById('premioDetallesModal');
  listaEl.innerHTML = '';
  const detalles = premioData.detallesPremio || [];
  if (detalles.length > 0) {
    detalles.forEach(d => {
      const li = document.createElement('li');
      li.className = 'mb-1';
      li.innerHTML = `<i class="bi bi-check-circle-fill text-success me-2"></i>`;
      li.appendChild(document.createTextNode(d));
      listaEl.appendChild(li);
    });
    detallesEl.classList.remove('d-none');
  } else {
    detallesEl.classList.add('d-none');
  }

  renderCarruselPremio();
}

function renderCarruselPremio() {
  const inner      = document.getElementById('carouselInner');
  const indicators = document.getElementById('carouselIndicators');
  const prevBtn    = document.getElementById('carouselPrev');
  const nextBtn    = document.getElementById('carouselNext');

  inner.innerHTML = '';
  indicators.innerHTML = '';

  const imgs = (premioData.imagenes || []).slice(0, 3);

  if (imgs.length === 0) {
    inner.innerHTML = `
      <div class="carousel-item active">
        <div class="premio-placeholder d-flex flex-column align-items-center justify-content-center p-4 text-center">
          <i class="bi bi-image text-muted" style="font-size:3rem;"></i>
          <p class="text-muted mt-2 mb-0 small">Aún no hay imágenes del premio cargadas.</p>
        </div>
      </div>`;
    prevBtn.classList.add('d-none');
    nextBtn.classList.add('d-none');
    indicators.classList.add('d-none');
    return;
  }

  imgs.forEach((src, idx) => {
    const item = document.createElement('div');
    item.className = 'carousel-item' + (idx === 0 ? ' active' : '');
    const img = document.createElement('img');
    img.src = src;
    img.className = 'd-block w-100';
    img.alt = `Imagen del premio ${idx + 1}`;
    item.appendChild(img);
    inner.appendChild(item);

    const ind = document.createElement('button');
    ind.type = 'button';
    ind.dataset.bsTarget = '#premioCarousel';
    ind.dataset.bsSlideTo = String(idx);
    if (idx === 0) {
      ind.className = 'active';
      ind.setAttribute('aria-current', 'true');
    }
    indicators.appendChild(ind);
  });

  const multi = imgs.length > 1;
  prevBtn.classList.toggle('d-none', !multi);
  nextBtn.classList.toggle('d-none', !multi);
  indicators.classList.toggle('d-none', !multi);
}

document.getElementById('btnVerPremio').addEventListener('click', () => {
  renderPremioVisual();
  verPremioModal.show();
});

// ─── SESIÓN DE USUARIO ──────────────────────────────────────────────
function claveUsuario(tipoDoc, numDoc) {
  return `${tipoDoc.trim().toUpperCase()}-${numDoc.trim()}`;
}

function iniciarSesion(usuario) {
  usuarioActual = usuario;
  localStorage.setItem('rifaSesionUsuario', JSON.stringify({
    usuario,
    lastActivity: Date.now()
  }));
  actualizarUISesion();
  actualizarMisNumerosBadge();
  reiniciarTemporizadorInactividad();
}

function cerrarSesion(porInactividad = false) {
  usuarioActual = null;
  localStorage.removeItem('rifaSesionUsuario');
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  registroModal.hide();
  misNumerosModal.hide();
  actualizarUISesion();

  if (porInactividad) {
    mostrarNotificacion('Tu sesión se cerró automáticamente tras 5 minutos de inactividad.');
  } else {
    mostrarNotificacion('Sesión finalizada correctamente.');
  }
}

function reiniciarTemporizadorInactividad() {
  if (!usuarioActual) return;

  localStorage.setItem('rifaSesionUsuario', JSON.stringify({
    usuario: usuarioActual,
    lastActivity: Date.now()
  }));

  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    cerrarSesion(true);
  }, INACTIVITY_LIMIT_MS);
}

function restaurarSesion() {
  const guardado = localStorage.getItem('rifaSesionUsuario');
  if (!guardado) {
    actualizarUISesion();
    return;
  }

  try {
    const sesion = JSON.parse(guardado);
    const transcurrido = Date.now() - (sesion.lastActivity || 0);
    if (sesion.usuario && transcurrido < INACTIVITY_LIMIT_MS) {
      usuarioActual = sesion.usuario;
      actualizarUISesion();
      actualizarMisNumerosBadge();
      inactivityTimer = setTimeout(() => {
        cerrarSesion(true);
      }, INACTIVITY_LIMIT_MS - transcurrido);
    } else {
      localStorage.removeItem('rifaSesionUsuario');
      actualizarUISesion();
    }
  } catch (e) {
    localStorage.removeItem('rifaSesionUsuario');
    actualizarUISesion();
  }
}

function actualizarUISesion() {
  const guestControls = document.getElementById('navGuestControls');
  const userControls  = document.getElementById('navUserControls');
  const userNameEl    = document.getElementById('navUserName');

  if (usuarioActual) {
    guestControls.classList.add('d-none');
    userControls.classList.remove('d-none');
    userNameEl.textContent = usuarioActual.nombre;
    actualizarMisNumerosBadge();
  } else {
    guestControls.classList.remove('d-none');
    userControls.classList.add('d-none');
    userNameEl.textContent = '';
  }
}

['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, () => {
    if (usuarioActual) reiniciarTemporizadorInactividad();
  }, { passive: true });
});

// ─── MIS NÚMEROS: VER Y LIBERAR ─────────────────────────────────────
function obtenerNumerosDeUsuario(usuario) {
  if (!usuario) return [];
  const keyActual = claveUsuario(usuario.tipoDoc, usuario.numDoc);
  const lista = [];

  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    const n = numeros[numStr];
    if (n && n.participante) {
      const keyPart = claveUsuario(n.participante.tipoDoc, n.participante.numDoc);
      if (keyPart === keyActual) {
        lista.push({
          numero: numStr,
          estado: n.estado,
          carrera: n.participante.carrera || 'N/A',
          grupo: n.participante.grupo || 'N/A'
        });
      }
    }
  }
  return lista;
}

function actualizarMisNumerosBadge() {
  const badge = document.getElementById('badgeMisNumerosCount');
  if (!badge) return;
  if (!usuarioActual) {
    badge.textContent = '0';
    return;
  }
  const lista = obtenerNumerosDeUsuario(usuarioActual);
  badge.textContent = String(lista.length);
}

function renderMisNumerosModal() {
  if (!usuarioActual) return;
  const lista = obtenerNumerosDeUsuario(usuarioActual);
  const tbody = document.getElementById('misNumerosTbody');
  const emptyAlert = document.getElementById('sinNumerosAlert');
  const tableCont = document.getElementById('tablaMisNumerosContainer');

  tbody.innerHTML = '';

  if (lista.length === 0) {
    emptyAlert.classList.remove('d-none');
    tableCont.classList.add('d-none');
    return;
  }

  emptyAlert.classList.add('d-none');
  tableCont.classList.remove('d-none');

  lista.forEach(item => {
    const tr = document.createElement('tr');

    const esPagado = item.estado === 'sold';
    const estadoBadge = esPagado
      ? `<span class="badge bg-danger"><i class="bi bi-check-circle-fill me-1"></i>Pagado</span>`
      : `<span class="badge bg-warning text-dark"><i class="bi bi-clock-history me-1"></i>Reservado (Pendiente)</span>`;

    const accionBtn = esPagado
      ? `<span class="text-muted small"><i class="bi bi-lock-fill me-1"></i>No cancelable</span>`
      : `<button type="button" class="btn btn-outline-danger btn-sm rounded-3 btn-liberar" data-num="${item.numero}">
           <i class="bi bi-x-circle me-1"></i>Liberar número
         </button>`;

    tr.innerHTML = `
      <td><span class="num-tag-badge">${item.numero}</span></td>
      <td>
        <div class="fw-semibold small text-dark">${item.carrera}</div>
        <div class="text-muted small">Grupo: ${item.grupo}</div>
      </td>
      <td>${estadoBadge}</td>
      <td class="text-end">${accionBtn}</td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-liberar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const numStr = e.currentTarget.dataset.num;
      await liberarNumeroUsuario(numStr);
    });
  });
}

async function liberarNumeroUsuario(numStr) {
  if (!usuarioActual) return;

  if (!confirm(`¿Estás seguro de que deseas liberar el número ${numStr}? Quedará disponible para que otra persona lo tome.`)) {
    return;
  }

  try {
    const res = await fetch('/api/liberar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: numStr, usuario: usuarioActual })
    });

    const data = await res.json();
    if (!data.success) {
      mostrarNotificacion(data.error || 'No se pudo liberar el número.');
      return;
    }

    mostrarNotificacion(`Has liberado el número ${numStr}.`);
    await cargarDatosServidor();
    renderMisNumerosModal();
  } catch (err) {
    mostrarNotificacion('Error de conexión al liberar el número.');
  }
}

document.getElementById('btnMisNumeros').addEventListener('click', async () => {
  if (!usuarioActual) {
    abrirModalLogin();
    return;
  }
  await cargarDatosServidor();
  renderMisNumerosModal();
  misNumerosModal.show();
});

// ─── BOTONES LOGIN / LOGOUT ─────────────────────────────────────────
document.getElementById('btnAbrirLogin').addEventListener('click', () => {
  numeroSeleccionado = null;
  abrirModalLogin();
});

document.getElementById('btnCerrarSesion').addEventListener('click', () => {
  numeroSeleccionado = null;
  cerrarSesion(false);
});

// ─── MODALES DE LOGIN Y REGISTRO CONTRA EL SERVIDOR (/api/usuarios) ─
function abrirModalLogin() {
  const form = document.getElementById('loginForm');
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('loginErrorAlert').classList.add('d-none');
  loginModal.show();
}

function abrirModalRegistroUsuario() {
  const form = document.getElementById('registroUsuarioForm');
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('regUserErrorAlert').classList.add('d-none');
  registroUsuarioModal.show();
}

document.getElementById('btnIrARegistro').addEventListener('click', () => {
  loginModal.hide();
  setTimeout(() => abrirModalRegistroUsuario(), 250);
});

document.getElementById('btnVolverALogin').addEventListener('click', () => {
  registroUsuarioModal.hide();
  setTimeout(() => abrirModalLogin(), 250);
});

// Submit Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorAlert = document.getElementById('loginErrorAlert');
  errorAlert.classList.add('d-none');

  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const tipoDoc = document.getElementById('loginTipoDoc').value;
  const numDoc  = document.getElementById('loginNumDoc').value.trim();

  try {
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', tipoDoc, numDoc })
    });

    const data = await res.json();
    if (!data.success) {
      errorAlert.textContent = data.error || 'Credenciales incorrectas.';
      errorAlert.classList.remove('d-none');
      return;
    }

    iniciarSesion(data.usuario);
    loginModal.hide();
    mostrarNotificacion(`Bienvenido, ${data.usuario.nombre}`);

    if (numeroSeleccionado !== null) {
      setTimeout(() => abrirModalReserva(numeroSeleccionado), 250);
    }
  } catch (err) {
    errorAlert.textContent = 'Error de conexión con el servidor.';
    errorAlert.classList.remove('d-none');
  }
});

// Submit Registro
document.getElementById('registroUsuarioForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorAlert = document.getElementById('regUserErrorAlert');
  errorAlert.classList.add('d-none');

  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const nombre   = document.getElementById('regNombre').value.trim();
  const tipoDoc  = document.getElementById('regTipoDoc').value;
  const numDoc   = document.getElementById('regNumDoc').value.trim();
  const telefono = document.getElementById('regTelefono').value.trim();
  const email    = document.getElementById('regEmail').value.trim();

  try {
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', nombre, tipoDoc, numDoc, telefono, email })
    });

    const data = await res.json();
    if (!data.success) {
      errorAlert.textContent = data.error || 'Error al crear la cuenta.';
      errorAlert.classList.remove('d-none');
      return;
    }

    iniciarSesion(data.usuario);
    registroUsuarioModal.hide();
    mostrarNotificacion(`Cuenta creada. ¡Bienvenido, ${data.usuario.nombre}!`);

    if (numeroSeleccionado !== null) {
      setTimeout(() => abrirModalReserva(numeroSeleccionado), 250);
    }
  } catch (err) {
    errorAlert.textContent = 'Error de conexión con el servidor.';
    errorAlert.classList.remove('d-none');
  }
});

// ─── GRILLA DE NÚMEROS (00 AL 99) ───────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('numbersGrid');
  grid.innerHTML = '';

  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    const n = numeros[numStr] || { estado: 'available', participante: null };
    const btn = document.createElement('button');
    btn.type        = 'button';
    btn.textContent = numStr;
    btn.className   = `num-btn ${n.estado}`;
    btn.dataset.num = numStr;

    if (n.participante) {
      const estadoTxt = n.estado === 'reserved' ? 'Reservado (Pendiente)' : 'Pagado';
      btn.title = `${estadoTxt}: ${n.participante.nombre}`;
    }

    if (n.estado === 'available') {
      btn.addEventListener('click', () => manejarClickNumero(numStr));
    }

    grid.appendChild(btn);
  }

  actualizarContadores();
}

function actualizarContadores() {
  let available = 0, reserved = 0, sold = 0;
  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    const n = numeros[numStr] || { estado: 'available' };
    if (n.estado === 'available') available++;
    else if (n.estado === 'reserved') reserved++;
    else sold++;
  }
  document.getElementById('countAvailable').textContent = available;
  document.getElementById('countReserved').textContent  = reserved;
  document.getElementById('countSold').textContent      = sold;
}

function manejarClickNumero(numStr) {
  numeroSeleccionado = numStr;
  if (!usuarioActual) {
    abrirModalLogin();
    return;
  }
  abrirModalReserva(numStr);
}

// ─── MODAL DE RESERVA (CARRERA Y GRUPO) CONTRA /api/reservar ────────
async function abrirModalReserva(numStr) {
  if (!usuarioActual) {
    abrirModalLogin();
    return;
  }

  // Refrescar datos del servidor antes de abrir
  await cargarDatosServidor();

  if (numeros[numStr] && numeros[numStr].estado !== 'available') {
    mostrarNotificacion(`El número ${numStr} ya fue reservado por otra persona.`);
    renderGrid();
    return;
  }

  numeroSeleccionado = numStr;
  document.getElementById('selectedNumberBadge').textContent = numStr;
  document.getElementById('reservaUserNombre').textContent = usuarioActual.nombre;
  document.getElementById('reservaUserDoc').textContent = `${usuarioActual.tipoDoc}: ${usuarioActual.numDoc}`;

  const form = document.getElementById('registroForm');
  form.classList.remove('was-validated');
  form.reset();

  registroModal.show();
}

document.getElementById('btnReservar').addEventListener('click', async () => {
  if (!usuarioActual) {
    registroModal.hide();
    abrirModalLogin();
    return;
  }

  const form = document.getElementById('registroForm');
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const carrera = document.getElementById('inputCarrera').value.trim();
  const grupo   = document.getElementById('inputGrupo').value.trim();

  try {
    const res = await fetch('/api/reservar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: numeroSeleccionado,
        usuario: usuarioActual,
        carrera,
        grupo
      })
    });

    const data = await res.json();
    if (!data.success) {
      alert(data.error || 'No se pudo reservar el número.');
      registroModal.hide();
      await cargarDatosServidor();
      return;
    }

    const numConfirmado = numeroSeleccionado;
    numeroSeleccionado = null;
    registroModal.hide();

    document.getElementById('confirmNumero').textContent = numConfirmado;
    document.getElementById('confirmNombre').textContent = usuarioActual.nombre;
    document.getElementById('confirmCarreraGrupo').textContent = `${carrera} · Grupo ${grupo}`;

    setTimeout(() => confirmModal.show(), 300);
    await cargarDatosServidor();
  } catch (err) {
    alert('Error de conexión al procesar la reserva.');
  }
});

// ─── INIT ────────────────────────────────────────────────────────────
restaurarSesion();
cargarDatosServidor();

// Auto-refresco cada 15 segundos para ver números reservados por otros usuarios en vivo
setInterval(() => {
  cargarDatosServidor();
}, 15000);
