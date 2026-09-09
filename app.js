// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://xmjkzjvfpbsyypxbeixb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtamt6anZmcGJzeXlweGJlaXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMDI3MDksImV4cCI6MjEwMjY3ODcwOX0.VaTYKIICuzFXgVHWj-Rzvx2sQ9Fpr5eOdXh0c1XnMZA';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let productosLista = [];
let itemsPaquete = [];

// --- VERIFICAR SESIÓN AL CARGAR LA PÁGINA ---
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await _supabase.auth.getSession();
  manejarEstadoSesion(session);

  // Escuchar cambios de sesión en tiempo real
  _supabase.auth.onAuthStateChange((_event, session) => {
    manejarEstadoSesion(session);
  });
});

function manejarEstadoSesion(session) {
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');
  const userEmailDisplay = document.getElementById('user-email-display');

  if (session) {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    userEmailDisplay.innerText = `👤 ${session.user.email}`;
    inicializarFormularioPaquete();
    cargarRelojes();
    cargarHistorialVentas();
    cargarGastos();
  } else {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
}

async function iniciarSesion(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('btn-login');

  btn.innerText = 'Verificando...';
  btn.disabled = true;

  const { data, error } = await _supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    alert('Error al iniciar sesión: ' + error.message);
    btn.innerText = '🔑 Iniciar Sesión';
    btn.disabled = false;
  }
}

async function cerrarSesion() {
  await _supabase.auth.signOut();
}

// --- CONTROL DE PESTAÑAS ---
async function cambiarPestaña(pestaña) {
  const tabs = ['consultar', 'ingresar', 'ventas', 'gastos', 'resumen', 'vender'];
  tabs.forEach(t => {
    const sec = document.getElementById(`pestaña-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (sec) {
      if (t === pestaña) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === pestaña) {
        btn.className = "tab-btn active";
      } else {
        btn.className = "tab-btn inactive";
      }
    }
  });

  if (pestaña === 'consultar') cargarRelojes();
  if (pestaña === 'ventas') cargarHistorialVentas();
  if (pestaña === 'gastos') cargarGastos();
  if (pestaña === 'resumen') await calcularResumenFinanciero();
}

// --- LÓGICA DE REGISTRO DE PAQUETE ---
function inicializarFormularioPaquete() {
  itemsPaquete = [];
  const contenedor = document.getElementById('contenedor-items');
  if (contenedor) {
    contenedor.innerHTML = '';
    agregarFilaReloj();
  }
}

function agregarFilaReloj() {
  const relojId = 'rel_' + Date.now() + Math.random().toString(36).substr(2, 4);
  const colorId = 'col_' + Date.now() + Math.random().toString(36).substr(2, 4);

  itemsPaquete.push({
    id: relojId,
    sku: '',
    modelo: '',
    costoReloj: 0,
    costoCaja: 0,
    colores: [
      { id: colorId, nombre: 'Negro', cantidad: 1 }
    ]
  });

  renderizarFilasPaquete();
  calcularTodoElPaquete();
}

function eliminarFilaReloj(relojId) {
  if (itemsPaquete.length <= 1) {
    alert('El paquete debe contener al menos 1 reloj.');
    return;
  }
  itemsPaquete = itemsPaquete.filter(item => item.id !== relojId);
  renderizarFilasPaquete();
  calcularTodoElPaquete();
}

function agregarColorAReloj(relojId) {
  const reloj = itemsPaquete.find(r => r.id === relojId);
  if (reloj) {
    const colorId = 'col_' + Date.now() + Math.random().toString(36).substr(2, 4);
    reloj.colores.push({ id: colorId, nombre: '', cantidad: 1 });
    renderizarFilasPaquete();
    calcularTodoElPaquete();
  }
}

function eliminarColorDeReloj(relojId, colorId) {
  const reloj = itemsPaquete.find(r => r.id === relojId);
  if (reloj) {
    if (reloj.colores.length <= 1) {
      alert('Cada reloj debe tener al menos un color registrado.');
      return;
    }
    reloj.colores = reloj.colores.filter(c => c.id !== colorId);
    renderizarFilasPaquete();
    calcularTodoElPaquete();
  }
}

function renderizarFilasPaquete() {
  const contenedor = document.getElementById('contenedor-items');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  itemsPaquete.forEach((item, index) => {
    let coloresHTML = '';

    item.colores.forEach((c) => {
      coloresHTML += `
        <div class="color-row">
          <div>
            <input type="text" value="${c.nombre}" 
                   oninput="actualizarColorData('${item.id}', '${c.id}', 'nombre', this.value)" 
                   placeholder="Nombre de Color" class="form-input" required>
          </div>
          <div>
            <input type="number" min="1" value="${c.cantidad}" 
                   oninput="actualizarColorData('${item.id}', '${c.id}', 'cantidad', parseInt(this.value) || 1)" 
                   placeholder="Cant." class="form-input" required>
          </div>
          <div>
            <input type="file" id="foto_${item.id}_${c.id}" accept="image/*" class="form-input">
          </div>
          <div>
            <button type="button" onclick="eliminarColorDeReloj('${item.id}', '${c.id}')" class="btn-remove-color" title="Eliminar">✕</button>
          </div>
        </div>
      `;
    });

    contenedor.innerHTML += `
      <div class="item-card" id="card-item-${item.id}">
        <div class="item-header">
          <span class="item-number">Modelo de Reloj #${index + 1}</span>
          <button type="button" onclick="eliminarFilaReloj('${item.id}')" class="btn-remove-item">✕ Eliminar Modelo</button>
        </div>

        <div class="form-grid cols-2">
          <div class="form-group">
            <label class="form-label">SKU Base / Código</label>
            <input type="text" value="${item.sku}" oninput="actualizarItemData('${item.id}', 'sku', this.value)" placeholder="Ej: LX-01" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Modelo / Nombre</label>
            <input type="text" value="${item.modelo}" oninput="actualizarItemData('${item.id}', 'modelo', this.value)" placeholder="Ej: Curren 8329" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Precio Reloj Unidad (USD)</label>
            <input type="number" step="0.01" value="${item.costoReloj || ''}" oninput="actualizarItemData('${item.id}', 'costoReloj', parseFloat(this.value) || 0)" placeholder="0.00" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Costo Caja / Estuche Unidad (USD)</label>
            <input type="number" step="0.01" value="${item.costoCaja || ''}" oninput="actualizarItemData('${item.id}', 'costoCaja', parseFloat(this.value) || 0)" placeholder="0.00" class="form-input">
          </div>
        </div>

        <div class="colors-section">
          <div class="colors-header">
            <span>🎨 Variantes de Color y Fotos</span>
            <button type="button" onclick="agregarColorAReloj('${item.id}')" class="btn-add-color">➕ Agregar Otro Color</button>
          </div>
          <div>${coloresHTML}</div>
        </div>

        <div class="item-calc-summary" id="summary-${item.id}"></div>
      </div>
    `;
  });
}

function actualizarItemData(id, campo, valor) {
  const item = itemsPaquete.find(i => i.id === id);
  if (item) {
    item[campo] = valor;
    calcularTodoElPaquete();
  }
}

function actualizarColorData(relojId, colorId, campo, valor) {
  const reloj = itemsPaquete.find(r => r.id === relojId);
  if (reloj) {
    const col = reloj.colores.find(c => c.id === colorId);
    if (col) {
      col[campo] = valor;
      calcularTodoElPaquete();
    }
  }
}

function calcularTodoElPaquete() {
  const envioTotalPkg = parseFloat(document.getElementById('pkg_envio_total').value) || 0;
  const courierTotalPkg = parseFloat(document.getElementById('pkg_courier_total').value) || 0;
  const criterio = document.getElementById('pkg_criterio').value;

  let totalUnidadesPkg = 0;
  let costoCompraRelojesTotal = 0;

  itemsPaquete.forEach(item => {
    const cantTotalModelo = item.colores.reduce((sum, c) => sum + (parseInt(c.cantidad) || 0), 0);
    item.cantTotalModelo = cantTotalModelo;
    totalUnidadesPkg += cantTotalModelo;
    costoCompraRelojesTotal += ((parseFloat(item.costoReloj) || 0) * cantTotalModelo);
  });

  let costoCajasTotalGlobal = 0;
  let impuestosTotalGlobal = 0;

  itemsPaquete.forEach(item => {
    const cant = item.cantTotalModelo || 1;
    const costoRelojUnidad = parseFloat(item.costoReloj) || 0;
    const costoCajaUnidad = parseFloat(item.costoCaja) || 0;

    let envioUnidad = 0;
    let courierUnidad = 0;

    if (totalUnidadesPkg > 0) {
      if (criterio === 'equitativo') {
        envioUnidad = envioTotalPkg / totalUnidadesPkg;
        courierUnidad = courierTotalPkg / totalUnidadesPkg;
      } else if (criterio === 'proporcional' && costoCompraRelojesTotal > 0) {
        const proporcion = costoRelojUnidad / costoCompraRelojesTotal;
        envioUnidad = (envioTotalPkg * proporcion);
        courierUnidad = (courierTotalPkg * proporcion);
      }
    }

    const baseImponibleUnidad = costoRelojUnidad + envioUnidad + costoCajaUnidad;
    const impuestoUnidad = baseImponibleUnidad * 0.60;
    const costoTotalFinalUnidad = baseImponibleUnidad + impuestoUnidad + courierUnidad;

    item.envioCalculado = envioUnidad;
    item.courierCalculado = courierUnidad;
    item.impuestoCalculado = impuestoUnidad;
    item.costoTotalFinalUnidad = costoTotalFinalUnidad;

    costoCajasTotalGlobal += (costoCajaUnidad * cant);
    impuestosTotalGlobal += (impuestoUnidad * cant);

    const summaryEl = document.getElementById(`summary-${item.id}`);
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div>Total Unidades: <strong>${cant} pzs</strong></div>
        <div>Envío Asignado: <strong>$${envioUnidad.toFixed(2)} USD</strong></div>
        <div>Caja: <strong>$${costoCajaUnidad.toFixed(2)} USD</strong></div>
        <div>Impuesto 60%: <strong style="color:var(--warning)">+$${impuestoUnidad.toFixed(2)} USD</strong></div>
        ${courierUnidad > 0 ? `<div>Courier: <strong>$${courierUnidad.toFixed(2)} USD</strong></div>` : ''}
        <div>Costo Final Unitario: <strong style="color:#ffffff">$${costoTotalFinalUnidad.toFixed(2)} USD</strong></div>
      `;
    }
  });

  const envioTotalCombinado = envioTotalPkg + courierTotalPkg;
  const costoEnvioPromedioPorUnidad = totalUnidadesPkg > 0 ? (envioTotalCombinado / totalUnidadesPkg) : 0;
  const costoTotalInversionPaquete = costoCompraRelojesTotal + costoCajasTotalGlobal + envioTotalCombinado + impuestosTotalGlobal;

  const resumenEl = document.getElementById('resumen-global-paquete');
  if (resumenEl) {
    resumenEl.innerHTML = `
      <div class="summary-card-metric">
        <span class="title">Total Unidades</span>
        <span class="value">${totalUnidadesPkg} pzs</span>
      </div>
      <div class="summary-card-metric">
        <span class="title">Envío Total</span>
        <span class="value">$${envioTotalCombinado.toFixed(2)} USD</span>
      </div>
      <div class="summary-card-metric">
        <span class="title">Promedio x/Unidad</span>
        <span class="value">$${costoEnvioPromedioPorUnidad.toFixed(2)} USD</span>
      </div>
      <div class="summary-card-metric">
        <span class="title">Inversión Total</span>
        <span class="value" style="color:var(--success)">$${costoTotalInversionPaquete.toFixed(2)} USD</span>
      </div>
    `;
  }
}

// --- OPERACIONES DE SUPABASE ---
async function guardarPaquete(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-guardar');
  btn.innerText = '⏳ Guardando y subiendo fotos...';
  btn.disabled = true;

  try {
    const registrosParaInsertar = [];

    for (const item of itemsPaquete) {
      for (const color of item.colores) {
        let imagenUrl = null;
        const fotoInput = document.getElementById(`foto_${item.id}_${color.id}`);

        if (fotoInput && fotoInput.files && fotoInput.files.length > 0) {
          const file = fotoInput.files[0];
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}_${file.name}`;
          
          const { error: uploadError } = await _supabase.storage.from('relojes').upload(fileName, file);

          if (!uploadError) {
            const { data: publicUrlData } = _supabase.storage.from('relojes').getPublicUrl(fileName);
            if (publicUrlData) {
              imagenUrl = publicUrlData.publicUrl;
            }
          } else {
            console.error("Error al subir la imagen:", uploadError.message);
          }
        }

        const skuFinal = color.nombre ? `${item.sku}-${color.nombre.toUpperCase()}` : item.sku;
        const cantidadColor = parseInt(color.cantidad) || 1;

        registrosParaInsertar.push({
          sku: skuFinal,
          modelo: item.modelo,
          color: color.nombre || 'Único',
          stock_inicial: cantidadColor,
          stock_actual: cantidadColor,
          costo_reloj: parseFloat(item.costoReloj),
          costo_envio: parseFloat(item.envioCalculado),
          costo_caja: parseFloat(item.costoCaja || 0),
          costo_courier: parseFloat(item.courierCalculado),
          costo_impuesto: parseFloat(item.impuestoCalculado),
          imagen_url: imagenUrl
        });
      }
    }

    const { error: insertError } = await _supabase.from('productos').insert(registrosParaInsertar);
    if (insertError) throw insertError;

    alert('¡Paquete registrado exitosamente!');
    inicializarFormularioPaquete();
    cambiarPestaña('consultar');

  } catch (err) {
    alert('Error al guardar: ' + err.message);
  } finally {
    btn.innerText = '💾 Guardar Paquete Completo en Inventario';
    btn.disabled = false;
  }
}

async function cargarRelojes() {
  const { data, error } = await _supabase.from('productos').select('*').order('created_at', { ascending: false });

  if (error) {
    console.error('Error al cargar datos:', error);
    return;
  }
  productosLista = data || [];
  renderizarTarjetas(productosLista);
}

function renderizarTarjetas(lista) {
  const grid = document.getElementById('grid-relojes');
  if (!grid) return;
  grid.innerHTML = '';

  let totalUnidades = 0;
  document.getElementById('total-modelos').innerText = lista.length;

  lista.forEach(prod => {
    totalUnidades += prod.stock_actual;

    const cReloj = Number(prod.costo_reloj || 0);
    const cEnvio = Number(prod.costo_envio || 0);
    const cCaja = Number(prod.costo_caja || 0);
    const cCourier = Number(prod.costo_courier || 0);

    const baseImponible = cReloj + cEnvio + cCaja;
    const cImpuesto = Number(prod.costo_impuesto !== undefined ? prod.costo_impuesto : (baseImponible * 0.60));
    const costoTotalFinal = baseImponible + cCourier + cImpuesto;

    const imagenUrl = prod.imagen_url || 'https://via.placeholder.com/300x300/18181b/ffffff?text=KAIRO';

    grid.innerHTML += `
      <div class="watch-card">
        <div>
          <div class="card-img-container">
            <img src="${imagenUrl}" alt="${prod.modelo}" class="card-img">
            <span class="badge-stock ${prod.stock_actual > 0 ? 'available' : 'empty'}">
              Stock: ${prod.stock_actual}
            </span>
            ${prod.color ? `<span class="badge-color">🎨 ${prod.color}</span>` : ''}
          </div>
          <div class="card-body">
            <div class="sku-tag">${prod.sku}</div>
            <h3 class="watch-title">${prod.modelo}</h3>
            
            <div class="cost-breakdown">
              <div class="cost-row"><span>Precio Reloj:</span> <span>$${cReloj.toFixed(2)} USD</span></div>
              <div class="cost-row"><span>Envío Asignado:</span> <span>$${cEnvio.toFixed(2)} USD</span></div>
              <div class="cost-row"><span>Caja:</span> <span>$${cCaja.toFixed(2)} USD</span></div>
              <div class="cost-row highlight"><span>Base Imponible:</span> <span>$${baseImponible.toFixed(2)} USD</span></div>
              <div class="cost-row"><span>Impuesto (60%):</span> <span>+$${cImpuesto.toFixed(2)} USD</span></div>
              ${cCourier > 0 ? `<div class="cost-row"><span>Courier:</span> <span>$${cCourier.toFixed(2)} USD</span></div>` : ''}
              <div class="cost-row total"><span>Costo Total Final:</span> <span>$${costoTotalFinal.toFixed(2)} USD</span></div>
            </div>
          </div>
        </div>

        <div class="card-footer" style="display: flex; gap: 8px;">
          <button onclick="venderUnidad('${prod.id}', ${prod.stock_actual})" 
                  class="btn-sell" 
                  ${prod.stock_actual <= 0 ? 'disabled' : ''}>
            🛒 Vender (-1)
          </button>
          <button onclick="eliminarReloj('${prod.id}', '${prod.modelo}')" 
                  class="btn-remove-item" 
                  style="padding: 10px 14px; margin: 0;">
            🗑️
          </button>
        </div>
      </div>
    `;
  });

  document.getElementById('total-unidades').innerText = totalUnidades;
}

function filtrarRelojes() {
  const texto = document.getElementById('input-buscar').value.toLowerCase();
  const filtrados = productosLista.filter(p => 
    (p.sku && p.sku.toLowerCase().includes(texto)) || 
    (p.modelo && p.modelo.toLowerCase().includes(texto)) ||
    (p.color && p.color.toLowerCase().includes(texto))
  );
  renderizarTarjetas(filtrados);
}

// --- REGISTRAR VENTA PERSONALIZADA ---
function venderUnidad(id, stockActual) {
  if (stockActual <= 0) return alert('No hay stock disponible');

  const prod = productosLista.find(p => p.id === id);
  if (!prod) return;

  document.getElementById('vender-prod-id').value = prod.id;
  document.getElementById('vender-stock-actual').value = stockActual;
  document.getElementById('vender-subtitulo').innerText = `Registrando venta para: ${prod.modelo} (${prod.color}) - Stock actual: ${stockActual}`;
  
  document.getElementById('vender-precio').value = '';
  document.getElementById('vender-comision').value = '0.00';
  document.getElementById('vender-envio').value = '0.00';

  cambiarPestaña('vender');
}

async function confirmarVentaUnidad(e) {
  e.preventDefault();
  const id = document.getElementById('vender-prod-id').value;
  const stockActual = parseInt(document.getElementById('vender-stock-actual').value);
  const prod = productosLista.find(p => p.id === id);
  if (!prod) return;

  const precioVenta = parseFloat(document.getElementById('vender-precio').value);
  if (isNaN(precioVenta) || precioVenta < 0) return alert('Precio inválido');

  const comisionPlataforma = parseFloat(document.getElementById('vender-comision').value) || 0;
  const gastoEnvio = parseFloat(document.getElementById('vender-envio').value) || 0;

  const cReloj = Number(prod.costo_reloj || 0);
  const cEnvio = Number(prod.costo_envio || 0);
  const cCaja = Number(prod.costo_caja || 0);
  const cCourier = Number(prod.costo_courier || 0);
  const baseImponible = cReloj + cEnvio + cCaja;
  const cImpuesto = Number(prod.costo_impuesto !== undefined ? prod.costo_impuesto : (baseImponible * 0.60));
  const costoTotalFinal = baseImponible + cCourier + cImpuesto;

  const gananciaNeta = precioVenta - costoTotalFinal - comisionPlataforma - gastoEnvio;

  const { error: errorVenta } = await _supabase.from('ventas').insert([{
    producto_id: prod.id,
    sku: prod.sku,
    modelo: prod.modelo,
    color: prod.color,
    precio_venta: precioVenta,
    comision_plataforma: comisionPlataforma,
    gasto_envio: gastoEnvio,
    ganancia_neta: gananciaNeta
  }]);

  if (errorVenta) {
    alert('Error al registrar la venta: ' + errorVenta.message);
    return;
  }

  const { error: errorUpdate } = await _supabase
    .from('productos')
    .update({ stock_actual: stockActual - 1 })
    .eq('id', id);

  if (!errorUpdate) {
    alert(`¡Venta registrada con éxito!\nGanancia estimada: $${gananciaNeta.toFixed(2)} USD`);
    cambiarPestaña('consultar');
    cargarRelojes();
    cargarHistorialVentas();
  }
}

// --- ELIMINAR RELOJ DEL INVENTARIO ---
async function eliminarReloj(id, modelo) {
  if (!confirm(`¿Estás seguro de eliminar por completo el modelo "${modelo}" del inventario?`)) return;

  const { error } = await _supabase.from('productos').delete().eq('id', id);

  if (error) {
    alert('Error al eliminar: ' + error.message);
  } else {
    alert('Reloj eliminado correctamente.');
    cargarRelojes();
  }
}

// --- CARGAR HISTORIAL DE VENTAS ---
async function cargarHistorialVentas() {
  const { data, error } = await _supabase.from('ventas').select('*').order('created_at', { ascending: false });

  const tbody = document.getElementById('tabla-ventas-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding: 16px; text-align: center; color: var(--text-muted);">No hay ventas registradas todavía.</td></tr>`;
    return;
  }

  data.forEach(v => {
    const fecha = new Date(v.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const gananciaColor = v.ganancia_neta >= 0 ? 'var(--success)' : 'var(--danger)';

    tbody.innerHTML += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 12px; color: var(--text-muted);">${fecha}</td>
        <td style="padding: 12px;"><strong>${v.sku}</strong><br><span style="color: var(--text-muted); font-size: 0.75rem;">${v.modelo}</span></td>
        <td style="padding: 12px;">🎨 ${v.color}</td>
        <td style="padding: 12px; font-weight: 700;">$${Number(v.precio_venta).toFixed(2)}</td>
        <td style="padding: 12px; color: var(--warning);">-$${Number(v.comision_plataforma).toFixed(2)}</td>
        <td style="padding: 12px; color: var(--warning);">-$${Number(v.gasto_envio).toFixed(2)}</td>
        <td style="padding: 12px; font-weight: 800; color: ${gananciaColor};">$${Number(v.ganancia_neta).toFixed(2)}</td>
        <td style="padding: 12px; text-align: center;">
          <button onclick="eliminarVenta('${v.id}', '${v.producto_id}')" class="btn-remove-item" style="padding: 4px 8px; margin: 0;" title="Eliminar venta y devolver stock">🗑️</button>
        </td>
      </tr>
    `;
  });
}

// --- ELIMINAR VENTA Y DEVOLVER STOCK ---
async function eliminarVenta(ventaId, productoId) {
  if (!confirm('¿Estás seguro de eliminar esta venta? Esto sumará nuevamente 1 unidad al stock del reloj.')) return;

  // 1. Obtener el producto asociado para conocer su stock actual
  const { data: producto, error: errProd } = await _supabase
    .from('productos')
    .select('stock_actual')
    .eq('id', productoId)
    .single();

  if (errProd || !producto) {
    alert('No se pudo encontrar el reloj asociado para devolver el stock (es posible que haya sido eliminado del inventario). Aún así, se procederá a eliminar la venta si lo deseas, o puedes cancelar.');
  } else {
    // 2. Sumar 1 al stock actual del producto
    const nuevoStock = producto.stock_actual + 1;
    const { error: errUpdate } = await _supabase
      .from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', productoId);

    if (errUpdate) {
      alert('Error al actualizar el stock: ' + errUpdate.message);
      return;
    }
  }

  // 3. Eliminar el registro de la venta
  const { error: errDelete } = await _supabase
    .from('ventas')
    .delete()
    .eq('id', ventaId);

  if (errDelete) {
    alert('Error al eliminar la venta: ' + errDelete.message);
    return;
  }

  alert('Venta eliminada correctamente y stock devuelto con éxito.');
  
  // 4. Recargar tablas y datos
  cargarHistorialVentas();
  cargarRelojes();
}

// --- GESTIÓN DE GASTOS VARIOS ---
async function guardarGasto(e) {
  e.preventDefault();
  const concepto = document.getElementById('gasto-concepto').value;
  const categoria = document.getElementById('gasto-categoria').value;
  const monto = parseFloat(document.getElementById('gasto-monto').value);

  const { error } = await _supabase.from('gastos').insert([{ concepto, categoria, monto }]);

  if (error) {
    alert('Error al registrar gasto: ' + error.message);
    return;
  }

  document.getElementById('form-gasto').reset();
  alert('¡Gasto registrado con éxito!');
  cargarGastos();
}

async function cargarGastos() {
  const { data, error } = await _supabase.from('gastos').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('tabla-gastos-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">No hay gastos registrados.</td></tr>`;
    return;
  }

  data.forEach(g => {
    const fecha = new Date(g.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    tbody.innerHTML += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 12px; color: var(--text-muted);">${fecha}</td>
        <td style="padding: 12px;"><strong>${g.concepto}</strong></td>
        <td style="padding: 12px;"><span class="badge-color">${g.categoria}</span></td>
        <td style="padding: 12px; color: var(--danger); font-weight: 700;">-$${Number(g.monto).toFixed(2)}</td>
        <td style="padding: 12px; text-align: center;">
          <button onclick="eliminarGasto('${g.id}')" class="btn-remove-item" style="padding: 4px 8px; margin: 0;">🗑️</button>
        </td>
      </tr>
    `;
  });
}

async function eliminarGasto(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  const { error } = await _supabase.from('gastos').delete().eq('id', id);
  if (!error) cargarGastos();
}

// --- RESUMEN FINANCIERO GLOBAL ---
async function calcularResumenFinanciero() {
  const { data: ventas } = await _supabase.from('ventas').select('*');
  const { data: gastos } = await _supabase.from('gastos').select('*');
  const { data: productos } = await _supabase.from('productos').select('*');

  let totalVentasBrutas = 0;
  let totalGananciaNetaVentas = 0;
  if (ventas) {
    ventas.forEach(v => {
      totalVentasBrutas += Number(v.precio_venta || 0);
      totalGananciaNetaVentas += Number(v.ganancia_neta || 0);
    });
  }

  let totalInversionRelojes = 0;
  if (productos) {
    productos.forEach(p => {
      const stockInicial = Number(p.stock_inicial || 0);
      const cReloj = Number(p.costo_reloj || 0);
      const cEnvio = Number(p.costo_envio || 0);
      const cCaja = Number(p.costo_caja || 0);
      const cCourier = Number(p.costo_courier || 0);
      const baseImponible = cReloj + cEnvio + cCaja;
      const cImpuesto = Number(p.costo_impuesto !== undefined ? p.costo_impuesto : (baseImponible * 0.60));
      const costoTotalFinalUnidad = baseImponible + cCourier + cImpuesto;
      
      totalInversionRelojes += (costoTotalFinalUnidad * stockInicial);
    });
  }

  let totalGastosVarios = 0;
  if (gastos) {
    gastos.forEach(g => {
      totalGastosVarios += Number(g.monto || 0);
    });
  }

  const balanceFinal = totalGananciaNetaVentas - totalInversionRelojes - totalGastosVarios;

  const gridMetricas = document.getElementById('grid-metricas-resumen');
  if (gridMetricas) {
    gridMetricas.innerHTML = `
      <div class="summary-card-metric">
        <span class="title">Ventas Totales (Brutas)</span>
        <span class="value">$${totalVentasBrutas.toFixed(2)} USD</span>
      </div>
      <div class="summary-card-metric">
        <span class="title">Inversión en Relojes</span>
        <span class="value" style="color:var(--warning)">$${totalInversionRelojes.toFixed(2)} USD</span>
      </div>
      <div class="summary-card-metric">
        <span class="title">Total Gastos Varios</span>
        <span class="value" style="color:var(--danger)">-$${totalGastosVarios.toFixed(2)} USD</span>
      </div>
      <div class="summary-card-metric">
        <span class="title">Balance Empresa (Neto)</span>
        <span class="value" style="color: ${balanceFinal >= 0 ? 'var(--success)' : 'var(--danger)'}">$${balanceFinal.toFixed(2)} USD</span>
      </div>
    `;
  }

  const detalleTexto = document.getElementById('detalle-balance-texto');
  if (detalleTexto) {
    detalleTexto.innerHTML = `
      <div>Suma total de ganancias netas por relojes vendidos: <strong>$${totalGananciaNetaVentas.toFixed(2)} USD</strong></div>
      <div>Menos capital invertido en stock de relojes: <strong style="color:var(--warning)">-$${totalInversionRelojes.toFixed(2)} USD</strong></div>
      <div>Menos total de gastos operativos/publicidad: <strong style="color:var(--danger)">-$${totalGastosVarios.toFixed(2)} USD</strong></div>
      <div style="border-top: 1px solid var(--border-color); padding-top: 6px; margin-top: 4px; color: var(--text-main);">
        Resultado final operativo: <strong>$${balanceFinal.toFixed(2)} USD</strong>
      </div>
    `;
  }
}