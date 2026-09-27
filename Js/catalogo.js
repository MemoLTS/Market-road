import { apiFetch } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    initCatalogo();
});

let productos = [];

async function initCatalogo() {
    const contenedor = document.getElementById('contenedor-productos');
    const buscador = document.getElementById('input-busqueda');

    if (!contenedor) return;

    renderCargando(contenedor);

    try {
        productos = await apiFetch('/productos'); // Endpoint del microservicio a través del Gateway
        renderProductos(productos, contenedor);
    } catch (error) {
        renderError(contenedor, 'No se pudo cargar el catálogo de productos.');
    }

    if (buscador) {
        buscador.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtrados = productos.filter(p =>
                p.nombre.toLowerCase().includes(query) ||
                p.descripcion?.toLowerCase().includes(query)
            );
            renderProductos(filtrados, contenedor);
        });
    }
}

function renderProductos(lista, contenedor) {
    if (lista.length === 0) {
        contenedor.innerHTML = '<p class="texto-vacío">No se encontraron productos disponibles.</p>';
        return;
    }

    contenedor.innerHTML = lista.map(producto => `
        <article class="card-producto">
        <img src="${producto.imagenUrl || 'assets/placeholder.jpg'}" alt="${producto.nombre}" loading="lazy">
        <div class="card-body">
            <h3>${producto.nombre}</h3>
            <p class="descripcion">${producto.descripcion || ''}</p>
            <div class="card-footer">
            <span class="precio">$${producto.precio.toFixed(2)}</span>
            <button class="btn-agregar" data-id="${producto.id}">Agregar al carrito</button>
            </div>
        </div>
        </article>
    `).join('');
}

function renderCargando(contenedor) {
    contenedor.innerHTML = '<div class="spinner">Cargando productos...</div>';
}

function renderError(contenedor, mensaje) {
    contenedor.innerHTML = `<div class="alerta-error">${mensaje}</div>`;
}