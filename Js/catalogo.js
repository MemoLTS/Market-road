import { apiFetch } from './api.js';

document.addEventListener('DOMContentLoaded', initCatalogo);

let productos = [];

const publicacionesDestacadas = [
    {
        id: 'bici-urbana', nombre: 'Bicicleta urbana', precio: 185000,
        descripcion: 'Bicicleta liviana, lista para recorrer la ciudad. Se entrega con luces delanteras y traseras.',
        imagenUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=85',
        categoria: 'Deportes', distancia: '1,2 km', ubicacion: 'Providencia', vendedor: 'Camila R.'
    },
    {
        id: 'camara-digital', nombre: 'Cámara digital compacta', precio: 92000,
        descripcion: 'Cámara compacta en buen estado, incluye batería y funda de transporte.',
        imagenUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85',
        categoria: 'Tecnología', distancia: '2,6 km', ubicacion: 'Ñuñoa', vendedor: 'Matías G.'
    },
    {
        id: 'sillon-verde', nombre: 'Sillón de dos cuerpos', precio: 145000,
        descripcion: 'Sillón cómodo de tela, muy bien cuidado. Disponible para retiro esta semana.',
        imagenUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85',
        categoria: 'Hogar', distancia: '3,1 km', ubicacion: 'La Reina', vendedor: 'Diego M.'
    },
    {
        id: 'audifonos', nombre: 'Audífonos inalámbricos', precio: 38000,
        descripcion: 'Audífonos con estuche de carga y cable USB. Funcionan perfectamente.',
        imagenUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85',
        categoria: 'Tecnología', distancia: '0,8 km', ubicacion: 'Macul', vendedor: 'Sofía P.'
    },
    {
        id: 'reloj-clasico', nombre: 'Reloj clásico', precio: 54000,
        descripcion: 'Reloj de pulsera con correa de cuero. Se entrega con su caja original.',
        imagenUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85',
        categoria: 'Accesorios', distancia: '4,0 km', ubicacion: 'Las Condes', vendedor: 'Andrés V.'
    },
    {
        id: 'zapatillas-rojas', nombre: 'Zapatillas urbanas', precio: 32000,
        descripcion: 'Zapatillas en excelente estado, poco uso. Talla 39.',
        imagenUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
        categoria: 'Moda', distancia: '1,7 km', ubicacion: 'San Joaquín', vendedor: 'Valentina C.'
    }
];

async function initCatalogo() {
    const contenedor = document.getElementById('contenedor-productos');
    const buscador = document.getElementById('input-busqueda');

    if (!contenedor) return;

    renderCargando(contenedor);

    try {
        const respuesta = await apiFetch('/productos');
        productos = Array.isArray(respuesta) && respuesta.length > 0
            ? respuesta.map((producto, index) => ({
                ...producto,
                imagenUrl: producto.imagenUrl || publicacionesDestacadas[index % publicacionesDestacadas.length].imagenUrl,
                descripcion: producto.descripcion || 'Consulta los detalles con la persona que publica.',
                categoria: producto.categoria?.nombre || producto.categoria || 'Artículo',
                distancia: producto.distancia || 'Por confirmar',
                ubicacion: producto.ubicacion || 'Zona por confirmar',
                vendedor: producto.vendedor || 'Vendedor Market-Road'
            }))
            : publicacionesDestacadas;
    } catch {
        productos = publicacionesDestacadas;
    }

    renderProductos(productos, contenedor);

    contenedor.addEventListener('click', (event) => {
        const tarjeta = event.target.closest('[data-producto-index]');
        if (!tarjeta) return;

        const producto = productos[Number(tarjeta.dataset.productoIndex)];
        if (producto) mostrarDetalle(producto);
    });

    if (buscador) {
        buscador.addEventListener('input', (event) => {
            const query = event.target.value.toLowerCase().trim();
            const filtrados = productos.filter(producto =>
                producto.nombre?.toLowerCase().includes(query) ||
                producto.descripcion?.toLowerCase().includes(query) ||
                producto.categoria?.toLowerCase().includes(query)
            );
            renderProductos(filtrados, contenedor);
        });
    }
}

function renderProductos(lista, contenedor) {
    if (lista.length === 0) {
        contenedor.innerHTML = '<p class="marketplace-empty">No hay publicaciones que coincidan con tu búsqueda.</p>';
        return;
    }

    contenedor.innerHTML = lista.map(producto => `
        <button class="marketplace-card" type="button" data-producto-index="${productos.indexOf(producto)}"
            aria-label="Ver ${escaparHTML(producto.nombre)}">
            <span class="marketplace-image-wrap">
                <img src="${escaparHTML(producto.imagenUrl || publicacionesDestacadas[0].imagenUrl)}"
                    alt="${escaparHTML(producto.nombre)}" loading="lazy">
                <span class="marketplace-category">${escaparHTML(producto.categoria || 'Artículo')}</span>
            </span>
            <span class="marketplace-card-copy">
                <span class="marketplace-card-title">${escaparHTML(producto.nombre)}</span>
                <span class="marketplace-card-price">${formatearPrecio(producto.precioFinal ?? producto.precio)}</span>
                <span class="marketplace-card-location"><i class="bi bi-geo-alt" aria-hidden="true"></i>
                    ${escaparHTML(producto.ubicacion || 'Zona por confirmar')}</span>
            </span>
        </button>
    `).join('');

    contenedor.querySelectorAll('.marketplace-card img').forEach(imagen => {
        imagen.addEventListener('error', () => {
            imagen.src = publicacionesDestacadas[0].imagenUrl;
        }, { once: true });
    });
}

function renderCargando(contenedor) {
    contenedor.innerHTML = '<p class="marketplace-loading">Cargando publicaciones...</p>';
}

function mostrarDetalle(producto) {
    document.getElementById('detalleImagen').src = producto.imagenUrl || publicacionesDestacadas[0].imagenUrl;
    document.getElementById('detalleImagen').alt = producto.nombre || 'Publicación';
    document.getElementById('detalleCategoria').textContent = producto.categoria || 'Artículo';
    document.getElementById('detalleTitulo').textContent = producto.nombre || 'Artículo';
    document.getElementById('detallePrecio').textContent = formatearPrecio(producto.precioFinal ?? producto.precio);
    document.getElementById('detalleDescripcion').textContent = producto.descripcion || 'Consulta los detalles con la persona que publica.';
    document.getElementById('detalleDistancia').textContent = producto.distancia || 'Por confirmar';
    document.getElementById('detalleUbicacion').textContent = producto.ubicacion || 'Zona por confirmar';
    document.getElementById('detalleVendedor').textContent = producto.vendedor || 'Vendedor Market-Road';

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetallePublicacion')).show();
}

function formatearPrecio(precio) {
    const valor = Number(precio);
    if (!Number.isFinite(valor)) return 'Precio a consultar';
    return `$${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(valor)}`;
}

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}