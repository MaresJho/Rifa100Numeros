// =========================================
//  RIFA VIRTUAL — app.js (Página Pública)
// =========================================

// ─── ESTADO EN MEMORIA ──────────────────────────────────────────────
let numeros = {};
for (let i = 0; i < 100; i++) {
  const numStr = String(i).padStart(2, '0');
  numeros[numStr] = { estado: 'available', participante: null };
}

let premioData = {
  nombrePremio: 'Samsung Galaxy Tab A11 (modelo Wi-Fi de 8.7 pulgadas)',
  descPremio: 'Rifa Pro-STUDIATON — Gran premio: Tablet Samsung Galaxy Tab A11 (modelo Wi-Fi de 8.7"). Valor por boleta: $30.000 COP (30k).',
  detallesPremio: [
    'Tablet Samsung Galaxy Tab A11 (Wi-Fi 8.7 pulgadas)',
    'Valor por boleta: $30.000 COP (30k)',
    'Juega con El Sinuano (sorteo de la noche) el 20 de noviembre',
    'Total 100 números (del 00 al 99)',
    'Entrega inmediata al ganador'
  ],
  imagenes: [],
  fechaSorteo: '20 de Noviembre',
  condicionesSorteo: 'Juega con las dos últimas cifras de la lotería El Sinuano (sorteo de la noche) del 20 de noviembre.'
};

let numeroSeleccionado = null;

// ─── REFERENCIAS A MODALES Y TOAST ──────────────────────────────────
const verPremioModal = new bootstrap.Modal(document.getElementById('verPremioModal'));
const registroModal  = new bootstrap.Modal(document.getElementById('registroModal'));
const confirmModal   = new bootstrap.Modal(document.getElementById('confirmModal'));
const sessionToast   = new bootstrap.Toast(document.getElementById('sessionToast'));

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
    }
  } catch (err) {
    console.warn('Usando estado local por fallo de red:', err.message);
  }
}

// ─── PREMIO E INFORMACIÓN DEL SORTEO ────────────────────────────────
function renderPremioVisual() {
  const nombre = premioData.nombrePremio || '🎁 Premio Principal';
  document.getElementById('premioNombreHero').textContent = nombre;
  document.getElementById('verPremioModalLabel').textContent = nombre;
  document.getElementById('premioNombreModal').textContent = nombre;
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

    if (n.estado === 'available') {
      btn.title = `Número ${numStr}: Disponible para seleccionar`;
      btn.addEventListener('click', () => abrirModalReserva(numStr));
    } else {
      const estadoTxt = n.estado === 'sold' ? 'Pagado / Vendido' : 'Reservado';
      btn.title = `Número ${numStr}: ${estadoTxt}`;
      btn.addEventListener('click', () => {
        mostrarNotificacion(`El número ${numStr} ya se encuentra ${estadoTxt.toLowerCase()}.`);
      });
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

// ─── MODAL DE RESERVA / SELECCIÓN DE NÚMERO ─────────────────────────
async function abrirModalReserva(numStr) {
  // Refrescar en segundo plano para verificar si el número sigue disponible
  await cargarDatosServidor();

  if (numeros[numStr] && numeros[numStr].estado !== 'available') {
    mostrarNotificacion(`El número ${numStr} acaba de ser seleccionado por otra persona.`);
    renderGrid();
    return;
  }

  numeroSeleccionado = numStr;
  document.getElementById('selectedNumberBadge').textContent = numStr;

  const form = document.getElementById('registroForm');
  form.classList.remove('was-validated');
  form.reset();

  const errAlert = document.getElementById('reservaErrorAlert');
  errAlert.classList.add('d-none');
  errAlert.textContent = '';

  registroModal.show();
}

// Submit Selección de Número
document.getElementById('btnReservar').addEventListener('click', async () => {
  const form = document.getElementById('registroForm');
  const errAlert = document.getElementById('reservaErrorAlert');
  errAlert.classList.add('d-none');

  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const documento      = document.getElementById('inputDocumento').value.trim();
  const nombre         = document.getElementById('inputNombre').value.trim();
  const telefono       = document.getElementById('inputTelefono').value.trim();
  const referenciaPago = document.getElementById('inputRefPago').value.trim();
  const curso          = document.getElementById('inputCurso').value.trim();
  const email          = document.getElementById('inputEmail').value.trim();

  const btnReservar = document.getElementById('btnReservar');
  const btnOriginalText = btnReservar.innerHTML;
  btnReservar.disabled = true;
  btnReservar.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Procesando...`;

  try {
    const res = await fetch('/api/reservar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: numeroSeleccionado,
        documento,
        nombre,
        telefono,
        referenciaPago,
        curso,
        email
      })
    });

    const data = await res.json();
    if (!data.success) {
      errAlert.textContent = data.error || 'No se pudo seleccionar el número.';
      errAlert.classList.remove('d-none');
      btnReservar.disabled = false;
      btnReservar.innerHTML = btnOriginalText;
      await cargarDatosServidor();
      return;
    }

    const numConfirmado = numeroSeleccionado;
    numeroSeleccionado = null;
    registroModal.hide();

    // Llenar datos de confirmación
    document.getElementById('confirmNumero').textContent = numConfirmado;
    document.getElementById('confirmNombre').textContent = nombre;
    document.getElementById('confirmDoc').textContent = documento;
    document.getElementById('confirmRefPago').textContent = referenciaPago;

    setTimeout(() => confirmModal.show(), 250);
    await cargarDatosServidor();
  } catch (err) {
    errAlert.textContent = 'Error de conexión al procesar la selección.';
    errAlert.classList.remove('d-none');
  } finally {
    btnReservar.disabled = false;
    btnReservar.innerHTML = btnOriginalText;
  }
});

// ─── INIT ────────────────────────────────────────────────────────────
cargarDatosServidor();

// Auto-refresco cada 15 segundos para ver números en vivo
setInterval(() => {
  cargarDatosServidor();
}, 15000);
