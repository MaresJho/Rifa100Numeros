// =========================================
//  RIFA VIRTUAL — app.js (00 al 99)
// =========================================

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutos

// ─── ESTADO GLOBAL: NÚMEROS DEL 00 AL 99 (100 números) ─────────────
const numeros = {};
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

let usuarios = {};       // { "CC-123456": { nombre, tipoDoc, numDoc, telefono, email } }
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

// ─── PREMIO E INFORMACIÓN DEL SORTEO (VISUALIZACIÓN) ────────────────
function cargarPremio() {
  const guardado = localStorage.getItem('rifaPremio');
  if (guardado) {
    try {
      const parsed = JSON.parse(guardado);
      premioData = {
        nombre: parsed.nombre || 'Premio Principal',
        desc: parsed.desc || 'Pronto se publicarán los detalles del premio.',
        detalles: Array.isArray(parsed.detalles) ? parsed.detalles : [],
        imagenes: Array.isArray(parsed.imagenes) ? parsed.imagenes.slice(0, 3) : [],
        fechaSorteo: parsed.fechaSorteo || 'Próximamente por definir',
        condicionesSorteo: parsed.condicionesSorteo || 'Juega con las dos últimas cifras de la lotería oficial.'
      };
    } catch (e) {
      console.warn('No se pudo leer rifaPremio:', e);
    }
  }
  renderPremioVisual();
}

function renderPremioVisual() {
  document.getElementById('premioNombreHero').textContent = '🎁 ' + premioData.nombre;
  document.getElementById('verPremioModalLabel').textContent = '🎁 ' + premioData.nombre;
  document.getElementById('premioNombreModal').textContent = premioData.nombre;
  document.getElementById('premioDescModal').textContent = premioData.desc;

  document.getElementById('sorteoFechaTexto').textContent = premioData.fechaSorteo || 'Por definir';
  document.getElementById('sorteoCondicionesTexto').textContent = premioData.condicionesSorteo || 'Por definir';

  const listaEl = document.getElementById('premioListaDetallesModal');
  const detallesEl = document.getElementById('premioDetallesModal');
  listaEl.innerHTML = '';
  if (premioData.detalles && premioData.detalles.length > 0) {
    premioData.detalles.forEach(d => {
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
  cargarPremio();
  verPremioModal.show();
});

// ─── SESIÓN Y CONTROL DE INACTIVIDAD (5 MINUTOS) ────────────────────
function cargarUsuarios() {
  const guardado = localStorage.getItem('rifaUsuarios');
  if (!guardado) return;
  try {
    usuarios = JSON.parse(guardado) || {};
  } catch (e) {
    console.warn('No se pudo leer rifaUsuarios:', e);
  }
}

function guardarUsuarios() {
  localStorage.setItem('rifaUsuarios', JSON.stringify(usuarios));
}

function claveUsuario(tipoDoc, numDoc) {
  return `${tipoDoc.trim().toUpperCase()}-${numDoc.trim()}`;
}

function iniciarSesion(usuario) {
  usuarioActual = usuario;
  localStorage.setItem('rifaSesion', JSON.stringify({
    usuario,
    lastActivity: Date.now()
  }));
  actualizarUISesion();
  actualizarMisNumerosBadge();
  reiniciarTemporizadorInactividad();
}

function cerrarSesion(porInactividad = false) {
  usuarioActual = null;
  localStorage.removeItem('rifaSesion');
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

  localStorage.setItem('rifaSesion', JSON.stringify({
    usuario: usuarioActual,
    lastActivity: Date.now()
  }));

  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    cerrarSesion(true);
  }, INACTIVITY_LIMIT_MS);
}

function restaurarSesion() {
  const guardado = localStorage.getItem('rifaSesion');
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
      localStorage.removeItem('rifaSesion');
      actualizarUISesion();
    }
  } catch (e) {
    localStorage.removeItem('rifaSesion');
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
          estado: n.estado, // 'reserved' o 'sold'
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
    btn.addEventListener('click', (e) => {
      const numStr = e.currentTarget.dataset.num;
      liberarNumeroUsuario(numStr);
    });
  });
}

function liberarNumeroUsuario(numStr) {
  if (!usuarioActual) return;
  const n = numeros[numStr];
  if (!n || n.estado !== 'reserved') {
    mostrarNotificacion('Solo puedes liberar números que se encuentren pendientes de pago.');
    return;
  }

  const keyActual = claveUsuario(usuarioActual.tipoDoc, usuarioActual.numDoc);
  const keyPart = n.participante ? claveUsuario(n.participante.tipoDoc, n.participante.numDoc) : '';

  if (keyPart !== keyActual) {
    mostrarNotificacion('No tienes permiso para liberar este número.');
    return;
  }

  if (confirm(`¿Estás seguro de que deseas liberar el número ${numStr}? Quedará disponible para que otra persona lo tome.`)) {
    numeros[numStr] = { estado: 'available', participante: null };
    localStorage.setItem('rifaNumeros', JSON.stringify(numeros));

    mostrarNotificacion(`Has liberado el número ${numStr}.`);
    renderGrid();
    actualizarMisNumerosBadge();
    renderMisNumerosModal();
  }
}

document.getElementById('btnMisNumeros').addEventListener('click', () => {
  if (!usuarioActual) {
    abrirModalLogin();
    return;
  }
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

// ─── MODALES DE LOGIN Y REGISTRO ────────────────────────────────────
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

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const errorAlert = document.getElementById('loginErrorAlert');
  errorAlert.classList.add('d-none');

  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const tipoDoc = document.getElementById('loginTipoDoc').value;
  const numDoc  = document.getElementById('loginNumDoc').value.trim();
  const key     = claveUsuario(tipoDoc, numDoc);

  const usuario = usuarios[key];
  if (!usuario) {
    errorAlert.textContent = 'No encontramos un usuario con ese documento. Por favor regístrate primero.';
    errorAlert.classList.remove('d-none');
    return;
  }

  iniciarSesion(usuario);
  loginModal.hide();
  mostrarNotificacion(`Bienvenido, ${usuario.nombre}`);

  if (numeroSeleccionado !== null) {
    setTimeout(() => abrirModalReserva(numeroSeleccionado), 250);
  }
});

document.getElementById('registroUsuarioForm').addEventListener('submit', (e) => {
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
  const key      = claveUsuario(tipoDoc, numDoc);

  if (usuarios[key]) {
    errorAlert.textContent = 'Ya existe una cuenta registrada con este tipo y número de documento.';
    errorAlert.classList.remove('d-none');
    return;
  }

  const nuevoUsuario = { nombre, tipoDoc, numDoc, telefono, email };
  usuarios[key] = nuevoUsuario;
  guardarUsuarios();

  iniciarSesion(nuevoUsuario);
  registroUsuarioModal.hide();
  mostrarNotificacion(`Cuenta creada. ¡Bienvenido, ${nuevoUsuario.nombre}!`);

  if (numeroSeleccionado !== null) {
    setTimeout(() => abrirModalReserva(numeroSeleccionado), 250);
  }
});

// ─── GRILLA DE NÚMEROS (00 AL 99) ───────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('numbersGrid');
  grid.innerHTML = '';

  for (let i = 0; i < 100; i++) {
    const numStr = String(i).padStart(2, '0');
    const btn = document.createElement('button');
    btn.type        = 'button';
    btn.textContent = numStr;
    btn.className   = `num-btn ${numeros[numStr].estado}`;
    btn.dataset.num = numStr;

    if (numeros[numStr].participante) {
      const estadoTxt = numeros[numStr].estado === 'reserved' ? 'Reservado (Pendiente)' : 'Pagado';
      btn.title = `${estadoTxt}: ${numeros[numStr].participante.nombre}`;
    }

    if (numeros[numStr].estado === 'available') {
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
    if (numeros[numStr].estado === 'available') available++;
    else if (numeros[numStr].estado === 'reserved') reserved++;
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

// ─── MODAL DE RESERVA (CARRERA Y GRUPO) ─────────────────────────────
function abrirModalReserva(numStr) {
  if (!usuarioActual) {
    abrirModalLogin();
    return;
  }

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

document.getElementById('btnReservar').addEventListener('click', () => {
  if (!usuarioActual) {
    registroModal.hide();
    abrirModalLogin();
    return;
  }

  if (numeros[numeroSeleccionado] && numeros[numeroSeleccionado].estado !== 'available') {
    alert(`El número ${numeroSeleccionado} ya no está disponible. Por favor elige otro.`);
    registroModal.hide();
    renderGrid();
    return;
  }

  const form = document.getElementById('registroForm');
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const carrera = document.getElementById('inputCarrera').value.trim();
  const grupo   = document.getElementById('inputGrupo').value.trim();

  const datosReserva = {
    ...usuarioActual,
    carrera,
    grupo
  };

  numeros[numeroSeleccionado] = { estado: 'reserved', participante: datosReserva };
  localStorage.setItem('rifaNumeros', JSON.stringify(numeros));

  const numConfirmado = numeroSeleccionado;
  numeroSeleccionado = null;

  registroModal.hide();

  document.getElementById('confirmNumero').textContent = numConfirmado;
  document.getElementById('confirmNombre').textContent = datosReserva.nombre;
  document.getElementById('confirmCarreraGrupo').textContent = `${carrera} · Grupo ${grupo}`;

  setTimeout(() => confirmModal.show(), 300);
  renderGrid();
  actualizarMisNumerosBadge();
});

// ─── CARGAR NÚMEROS DESDE STORAGE ───────────────────────────────────
function cargarDesdeStorage() {
  const guardado = localStorage.getItem('rifaNumeros');
  if (!guardado) return;
  try {
    const datos = JSON.parse(guardado);
    for (let i = 0; i < 100; i++) {
      const numStr = String(i).padStart(2, '0');
      if (datos[numStr]) {
        numeros[numStr] = datos[numStr];
      } else if (datos[i]) {
        numeros[numStr] = datos[i];
      }
    }
  } catch (e) {
    console.warn('No se pudo leer rifaNumeros:', e);
  }
}

// ─── INIT ────────────────────────────────────────────────────────────
cargarDesdeStorage();
cargarUsuarios();
cargarPremio();
restaurarSesion();
renderGrid();
