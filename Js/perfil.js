import { actualizarUsuarioSesion, apiFetch, obtenerSesion, urlAbsoluta } from './api.js';
import { buscarLugares } from './geocodificacion.js';
import { mensajeDeError, mostrarAlerta, ocultarAlerta, opcionalPorId } from './util.js';
import { validarCorreo, validarUbicacion } from './validaciones.js';
const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024;
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const REGEX_APODO = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
document.addEventListener('DOMContentLoaded', () => {
    const boton = opcionalPorId('btnPerfil');
    const modal = opcionalPorId('modalPerfil');
    const formulario = opcionalPorId('formPerfil');
    const entradaFoto = opcionalPorId('fotoPerfilArchivo');
    const entradaApodo = opcionalPorId('perfilApodo');
    const posicionX = opcionalPorId('fotoPerfilPosicionX');
    const posicionY = opcionalPorId('fotoPerfilPosicionY');
    const vistaPrevia = opcionalPorId('fotoPerfilPreview');
    const fotoSinFoto = opcionalPorId('fotoPerfilSinFoto');
    const estadoFoto = opcionalPorId('fotoPerfilEstado');
    const controlesRecorte = opcionalPorId('fotoPerfilControlesRecorte');
    const botonCentrar = opcionalPorId('btnCentrarFotoPerfil');
    const botonRecortar = opcionalPorId('btnRecortarFotoPerfil');
    const alerta = opcionalPorId('perfilAlerta');
    const entradaCiudad = opcionalPorId('perfilCiudad');
    const resultadosCiudad = opcionalPorId('resultadosPerfilCiudad');
    const formularioCorreo = opcionalPorId('formCorreoPerfil');
    const entradaCorreo = opcionalPorId('perfilCorreo');
    const correoActual = opcionalPorId('perfilCorreoActual');
    const entradaContrasena = opcionalPorId('perfilContrasenaActual');
    const alertaCorreo = opcionalPorId('correoPerfilAlerta');
    const estadoDispositivos = opcionalPorId('perfilDispositivosEstado');
    const listaDispositivos = opcionalPorId('perfilDispositivosLista');
    let fotoOriginal = null;
    let fotoParaSubir = null;
    let imagenOriginal = null;
    let urlOriginal = null;
    let urlRecortada = null;
    let ciudadSeleccionada = null;
    let temporizadorCiudad = null;
    let solicitudCiudad = null;
    let solicitudFoto = null;
    let solicitudDispositivos = 0;
    let urlFotoGuardada = null;
    boton?.addEventListener('click', () => {
        const sesion = obtenerSesion();
        if (!sesion) {
            mostrarMensaje('Inicia sesión para editar tu perfil.', true);
            return;
        }
        if (entradaApodo)
            entradaApodo.value = sesion.usuario.apodo ?? '';
        if (entradaCiudad)
            entradaCiudad.value = sesion.usuario.ciudad ?? '';
        ciudadSeleccionada = sesion.usuario.ciudad;
        if (correoActual)
            correoActual.textContent = sesion.usuario.correo;
        if (entradaCorreo)
            entradaCorreo.value = '';
        if (entradaContrasena)
            entradaContrasena.value = '';
        if (resultadosCiudad)
            resultadosCiudad.replaceChildren();
        ocultarAlerta(alertaCorreo);
        void cargarFotoPerfil(sesion.usuario.id);
        void cargarHistorialDispositivos(sesion.usuario.id);
        limpiarAlerta();
    });
    async function cargarFotoPerfil(usuarioId) {
        solicitudFoto?.abort();
        solicitudFoto = new AbortController();
        const solicitudActual = solicitudFoto;
        liberarUrlFotoGuardada();
        vistaPrevia?.classList.add('d-none');
        fotoSinFoto?.classList.remove('d-none');
        if (estadoFoto)
            estadoFoto.textContent = 'Cargando foto de perfil...';
        try {
            const respuesta = await fetch(urlAbsoluta(`/api/v1/usuarios/${usuarioId}/foto?v=${Date.now()}`), {
                cache: 'no-store',
                signal: solicitudActual.signal,
            });
            if (!respuesta.ok)
                throw new Error(`El servidor respondió con el estado ${respuesta.status}.`);
            const blob = await respuesta.blob();
            if (solicitudActual.signal.aborted)
                return;
            const tipo = respuesta.headers.get('Content-Type') ?? blob.type;
            if (tipo.includes('image/svg+xml')) {
                if (estadoFoto)
                    estadoFoto.textContent = 'Aún no tienes una foto de perfil guardada.';
                return;
            }
            if (!tipo.startsWith('image/')) {
                throw new Error('El servidor no devolvió un archivo de imagen.');
            }
            urlFotoGuardada = URL.createObjectURL(blob);
            if (!vistaPrevia)
                return;
            vistaPrevia.onload = () => {
                vistaPrevia.classList.remove('d-none');
                fotoSinFoto?.classList.add('d-none');
                if (estadoFoto)
                    estadoFoto.textContent = 'Foto de perfil actual.';
            };
            vistaPrevia.onerror = () => {
                vistaPrevia.classList.add('d-none');
                if (estadoFoto)
                    estadoFoto.textContent = 'No se pudo mostrar la foto guardada. Puedes seleccionar otra.';
            };
            vistaPrevia.src = urlFotoGuardada;
        }
        catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError')
                return;
            if (estadoFoto) {
                estadoFoto.textContent = `No se pudo cargar la foto de perfil: ${mensajeDeError(error, 'error desconocido')}`;
            }
        }
    }
    async function cargarHistorialDispositivos(usuarioId) {
        if (!estadoDispositivos || !listaDispositivos)
            return;
        const solicitudActual = ++solicitudDispositivos;
        estadoDispositivos.textContent = 'Cargando historial...';
        listaDispositivos.replaceChildren();
        try {
            const registros = await apiFetch(`/usuarios/${usuarioId}/dispositivos`);
            if (solicitudActual !== solicitudDispositivos)
                return;
            if (!registros.length) {
                estadoDispositivos.textContent = 'Aún no hay dispositivos registrados. Los próximos inicios de sesión aparecerán aquí.';
                return;
            }
            estadoDispositivos.textContent = 'Se muestran hasta 5 dispositivos y sus 3 inicios de sesión más recientes.';
            const repeticiones = new Map();
            for (const dispositivo of registros) {
                repeticiones.set(dispositivo.dispositivo, (repeticiones.get(dispositivo.dispositivo) ?? 0) + 1);
            }
            const ordenes = new Map();
            for (const dispositivo of registros) {
                const fila = document.createElement('li');
                fila.className = 'list-group-item';
                const nombre = document.createElement('span');
                nombre.className = 'fw-semibold';
                const orden = (ordenes.get(dispositivo.dispositivo) ?? 0) + 1;
                ordenes.set(dispositivo.dispositivo, orden);
                nombre.textContent = (repeticiones.get(dispositivo.dispositivo) ?? 0) > 1
                    ? `${dispositivo.dispositivo} · dispositivo ${orden}`
                    : dispositivo.dispositivo;
                const sesiones = document.createElement('ul');
                sesiones.className = 'list-unstyled mb-0 mt-2';
                for (const fechaInicio of dispositivo.sesiones) {
                    const detalle = document.createElement('li');
                    detalle.className = 'd-flex justify-content-between gap-3 text-muted';
                    const descripcion = document.createElement('span');
                    descripcion.textContent = 'Inicio de sesión';
                    const fecha = document.createElement('time');
                    fecha.dateTime = fechaInicio;
                    fecha.className = 'text-end';
                    fecha.textContent = new Intl.DateTimeFormat('es', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                    }).format(new Date(fechaInicio));
                    detalle.append(descripcion, fecha);
                    sesiones.append(detalle);
                }
                fila.append(nombre, sesiones);
                listaDispositivos.append(fila);
            }
        }
        catch (error) {
            if (solicitudActual !== solicitudDispositivos)
                return;
            if (error instanceof DOMException && error.name === 'AbortError')
                return;
            estadoDispositivos.textContent = `No se pudo cargar el historial: ${mensajeDeError(error, 'error desconocido')}`;
        }
    }
    entradaCiudad?.addEventListener('input', () => {
        if (entradaCiudad.value.trim() !== ciudadSeleccionada)
            ciudadSeleccionada = null;
        if (temporizadorCiudad)
            clearTimeout(temporizadorCiudad);
        solicitudCiudad?.abort();
        if (!resultadosCiudad)
            return;
        resultadosCiudad.replaceChildren();
        const consulta = entradaCiudad.value.trim();
        if (consulta.length < 2)
            return;
        resultadosCiudad.textContent = 'Buscando localidades...';
        temporizadorCiudad = setTimeout(() => void buscarCiudades(consulta), 350);
    });
    async function buscarCiudades(consulta) {
        solicitudCiudad = new AbortController();
        try {
            const lugares = await buscarLugares(consulta, solicitudCiudad.signal);
            if (entradaCiudad?.value.trim() !== consulta || !resultadosCiudad)
                return;
            resultadosCiudad.replaceChildren();
            if (!lugares.length) {
                resultadosCiudad.textContent = 'No encontramos ciudades o pueblos con ese nombre.';
                return;
            }
            for (const lugar of lugares) {
                const opcion = document.createElement('button');
                opcion.type = 'button';
                opcion.className = 'list-group-item list-group-item-action';
                opcion.setAttribute('role', 'option');
                opcion.textContent = lugar.nombre;
                opcion.addEventListener('click', () => {
                    if (entradaCiudad)
                        entradaCiudad.value = lugar.nombre;
                    ciudadSeleccionada = lugar.nombre;
                    resultadosCiudad.replaceChildren();
                });
                resultadosCiudad.append(opcion);
            }
        }
        catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError')
                return;
            if (resultadosCiudad && entradaCiudad?.value.trim() === consulta) {
                resultadosCiudad.textContent = mensajeDeError(error, 'No se pudieron buscar ciudades.');
            }
        }
    }
    entradaFoto?.addEventListener('change', () => {
        const archivo = entradaFoto.files?.[0];
        limpiarAlerta();
        if (!archivo)
            return;
        const error = validarFoto(archivo);
        if (error) {
            entradaFoto.value = '';
            mostrarMensaje(error, true);
            return;
        }
        liberarVistasPrevias();
        solicitudFoto?.abort();
        liberarUrlFotoGuardada();
        fotoOriginal = archivo;
        fotoParaSubir = archivo;
        urlOriginal = URL.createObjectURL(archivo);
        imagenOriginal = new Image();
        imagenOriginal.onload = () => {
            if (!vistaPrevia)
                return;
            vistaPrevia.src = urlOriginal ?? '';
            vistaPrevia.style.objectPosition = '50% 50%';
            vistaPrevia.classList.remove('d-none');
            fotoSinFoto?.classList.add('d-none');
            if (estadoFoto)
                estadoFoto.textContent = 'Vista previa lista. Guarda los cambios para conservarla.';
            controlesRecorte?.classList.remove('d-none');
            if (posicionX)
                posicionX.value = '50';
            if (posicionY)
                posicionY.value = '50';
        };
        imagenOriginal.onerror = () => {
            fotoOriginal = null;
            fotoParaSubir = null;
            vistaPrevia?.classList.add('d-none');
            fotoSinFoto?.classList.remove('d-none');
            if (estadoFoto)
                estadoFoto.textContent = 'No se pudo leer la imagen seleccionada.';
            mostrarMensaje('No se pudo leer la imagen seleccionada.', true);
        };
        imagenOriginal.src = urlOriginal;
    });
    posicionX?.addEventListener('input', actualizarPosicion);
    posicionY?.addEventListener('input', actualizarPosicion);
    botonCentrar?.addEventListener('click', () => {
        if (posicionX)
            posicionX.value = '50';
        if (posicionY)
            posicionY.value = '50';
        actualizarPosicion();
    });
    botonRecortar?.addEventListener('click', async () => {
        if (!imagenOriginal || !fotoOriginal) {
            mostrarMensaje('Primero selecciona una imagen.', true);
            return;
        }
        botonRecortar.disabled = true;
        try {
            const recorte = await recortarImagen(imagenOriginal, Number(posicionX?.value ?? 50), Number(posicionY?.value ?? 50));
            liberarUrlRecortada();
            urlRecortada = URL.createObjectURL(recorte);
            fotoParaSubir = new File([recorte], 'foto-perfil.png', { type: 'image/png' });
            if (vistaPrevia) {
                vistaPrevia.src = urlRecortada;
                vistaPrevia.style.objectPosition = '50% 50%';
            }
            mostrarMensaje('Recorte aplicado. Guarda el perfil para conservarlo.', false);
        }
        catch (e) {
            mostrarMensaje(mensajeDeError(e, 'No se pudo recortar la imagen.'), true);
        }
        finally {
            botonRecortar.disabled = false;
        }
    });
    formulario?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const sesion = obtenerSesion();
        if (!sesion) {
            mostrarMensaje('Tu sesión expiró. Inicia sesión nuevamente.', true);
            return;
        }
        const nuevoApodo = entradaApodo?.value.trim() ?? '';
        if (nuevoApodo && (nuevoApodo.length > 20 || !REGEX_APODO.test(nuevoApodo))) {
            mostrarMensaje('El apodo debe tener hasta 20 caracteres y usar letras, números, punto, guion o guion bajo.', true);
            return;
        }
        const apodoCambio = nuevoApodo !== (sesion.usuario.apodo ?? '');
        const nuevaCiudad = entradaCiudad?.value.trim() ?? '';
        const ciudadActual = sesion.usuario.ciudad ?? '';
        const ciudadCambio = nuevaCiudad !== ciudadActual;
        const errorCiudad = nuevaCiudad ? validarUbicacion(nuevaCiudad) : null;
        if (errorCiudad) {
            mostrarMensaje(errorCiudad, true);
            entradaCiudad?.focus();
            return;
        }
        if (ciudadCambio && nuevaCiudad && ciudadSeleccionada !== nuevaCiudad) {
            mostrarMensaje('Selecciona una ciudad o pueblo de los resultados.', true);
            entradaCiudad?.focus();
            return;
        }
        if (!apodoCambio && !ciudadCambio && !fotoParaSubir) {
            mostrarMensaje('No hay cambios para guardar.', false);
            return;
        }
        const botonGuardar = opcionalPorId('btnGuardarPerfil');
        if (botonGuardar)
            botonGuardar.disabled = true;
        try {
            if (fotoOriginal && imagenOriginal?.naturalWidth && imagenOriginal.naturalHeight) {
                const recorte = await recortarImagen(imagenOriginal, Number(posicionX?.value ?? 50), Number(posicionY?.value ?? 50));
                fotoParaSubir = new File([recorte], 'foto-perfil.png', { type: 'image/png' });
            }
            else if (fotoOriginal) {
                throw new Error('Espera a que termine de cargarse la imagen antes de guardar.');
            }
            if (fotoParaSubir) {
                const datos = new FormData();
                datos.append('foto', fotoParaSubir);
                await apiFetch(`/usuarios/${sesion.usuario.id}/foto`, { method: 'PUT', body: datos });
            }
            if (apodoCambio || ciudadCambio) {
                const usuario = await apiFetch(`/usuarios/${sesion.usuario.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        ...(apodoCambio ? { apodo: nuevoApodo } : {}),
                        ...(ciudadCambio ? { ciudad: nuevaCiudad } : {}),
                    }),
                });
                actualizarUsuarioSesion(usuario);
            }
            window.dispatchEvent(new CustomEvent('mr:foto-perfil-actualizada'));
            if (modal)
                bootstrap.Modal.getOrCreateInstance(modal).hide();
        }
        catch (e) {
            mostrarMensaje(mensajeDeError(e, 'No se pudo guardar el perfil.'), true);
        }
        finally {
            if (botonGuardar)
                botonGuardar.disabled = false;
        }
    });
    formularioCorreo?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const sesion = obtenerSesion();
        if (!sesion) {
            mostrarAlerta(alertaCorreo, 'Tu sesión expiró. Inicia sesión nuevamente.');
            return;
        }
        const correo = entradaCorreo?.value.trim() ?? '';
        const contrasenaActual = entradaContrasena?.value ?? '';
        const errorCorreo = validarCorreo(correo);
        if (errorCorreo) {
            mostrarAlerta(alertaCorreo, errorCorreo);
            entradaCorreo?.focus();
            return;
        }
        if (!contrasenaActual) {
            mostrarAlerta(alertaCorreo, 'Ingresa tu contraseña actual.');
            entradaContrasena?.focus();
            return;
        }
        if (correo.toLowerCase() === sesion.usuario.correo.toLowerCase()) {
            mostrarAlerta(alertaCorreo, 'El nuevo correo es igual al correo actual.');
            return;
        }
        const botonGuardar = opcionalPorId('btnGuardarCorreo');
        if (botonGuardar)
            botonGuardar.disabled = true;
        try {
            const usuario = await apiFetch(`/usuarios/${sesion.usuario.id}/correo`, {
                method: 'PATCH',
                body: JSON.stringify({ correo, contrasenaActual }),
            });
            actualizarUsuarioSesion(usuario);
            if (correoActual)
                correoActual.textContent = usuario.correo;
            formularioCorreo?.reset();
            if (entradaContrasena)
                entradaContrasena.value = '';
            mostrarAlerta(alertaCorreo, 'Correo actualizado correctamente.', 'success');
        }
        catch (error) {
            mostrarAlerta(alertaCorreo, mensajeDeError(error, 'No se pudo actualizar el correo.'));
        }
        finally {
            if (botonGuardar)
                botonGuardar.disabled = false;
        }
    });
    modal?.addEventListener('hidden.bs.modal', () => {
        formulario?.reset();
        formularioCorreo?.reset();
        vistaPrevia?.classList.add('d-none');
        vistaPrevia?.removeAttribute('src');
        fotoSinFoto?.classList.remove('d-none');
        if (estadoFoto)
            estadoFoto.textContent = '';
        liberarUrlFotoGuardada();
        listaDispositivos?.replaceChildren();
        if (estadoDispositivos)
            estadoDispositivos.textContent = '';
        controlesRecorte?.classList.add('d-none');
        fotoOriginal = null;
        fotoParaSubir = null;
        imagenOriginal = null;
        liberarVistasPrevias();
        ciudadSeleccionada = null;
        solicitudCiudad?.abort();
        solicitudFoto?.abort();
        solicitudDispositivos++;
        if (temporizadorCiudad)
            clearTimeout(temporizadorCiudad);
        resultadosCiudad?.replaceChildren();
        limpiarAlerta();
        ocultarAlerta(alertaCorreo);
    });
    function actualizarPosicion() {
        if (!imagenOriginal || !vistaPrevia || !urlOriginal)
            return;
        fotoParaSubir = fotoOriginal;
        liberarUrlRecortada();
        vistaPrevia.src = urlOriginal;
        vistaPrevia.style.objectPosition = `${posicionX?.value ?? 50}% ${posicionY?.value ?? 50}%`;
    }
    function validarFoto(archivo) {
        if (!TIPOS_FOTO.includes(archivo.type))
            return 'La imagen debe ser JPG, PNG o WEBP.';
        if (archivo.size === 0)
            return 'La imagen está vacía.';
        if (archivo.size > TAMANO_MAXIMO_FOTO)
            return 'La imagen no puede superar los 5 MB.';
        return null;
    }
    async function recortarImagen(imagen, x, y) {
        const lado = Math.min(imagen.naturalWidth, imagen.naturalHeight);
        const origenX = (imagen.naturalWidth - lado) * x / 100;
        const origenY = (imagen.naturalHeight - lado) * y / 100;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const contexto = canvas.getContext('2d');
        if (!contexto)
            throw new Error('Tu navegador no pudo preparar el recorte.');
        contexto.drawImage(imagen, origenX, origenY, lado, lado, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(resultado => resultado
                ? resolve(resultado)
                : reject(new Error('No se pudo generar la imagen recortada.')), 'image/png');
        });
        return blob;
    }
    function liberarUrlRecortada() {
        if (urlRecortada)
            URL.revokeObjectURL(urlRecortada);
        urlRecortada = null;
    }
    function liberarVistasPrevias() {
        if (urlOriginal)
            URL.revokeObjectURL(urlOriginal);
        urlOriginal = null;
        liberarUrlRecortada();
    }
    function liberarUrlFotoGuardada() {
        if (urlFotoGuardada)
            URL.revokeObjectURL(urlFotoGuardada);
        urlFotoGuardada = null;
        if (vistaPrevia) {
            vistaPrevia.onload = null;
            vistaPrevia.onerror = null;
        }
    }
    function mostrarMensaje(mensaje, esError) {
        if (!alerta)
            return;
        alerta.textContent = mensaje;
        alerta.classList.remove('d-none', 'alert-danger', 'alert-success');
        alerta.classList.add(esError ? 'alert-danger' : 'alert-success');
    }
    function limpiarAlerta() {
        alerta?.classList.add('d-none');
        if (alerta)
            alerta.textContent = '';
    }
});
