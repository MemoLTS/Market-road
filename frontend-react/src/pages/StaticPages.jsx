import { useState } from 'react';
import Alert from '../components/common/Alert.jsx';
import { Link } from '../core/router.jsx';
import { primerError, validarCorreo, validarMensaje, validarNombre } from '../core/validaciones.js';

export function NosotrosPage() {
    return (
        <div className="container py-4" style={{ maxWidth: 820 }}>
            <h1 className="h2 mb-3">Sobre Market-Road</h1>
            <p>Market-Road es una plataforma que conecta a personas que quieren vender con personas que quieren comprar artículos de segunda mano.</p>
            <p>Somos solo intermediarios: no cobramos comisiones, no procesamos pagos ni gestionamos envíos. El acuerdo de precio, pago y entrega se coordina entre las dos partes a través del chat y las ofertas de la plataforma.</p>
            <h2 className="h5 mt-4">Cómo funciona</h2>
            <ol>
                <li>Crea una cuenta gratuita.</li>
                <li>Publica tu artículo con fotos, precio y localidad.</li>
                <li>Recibe mensajes y ofertas, y acuerda la entrega.</li>
            </ol>
            <Link to="/" className="btn btn-primary">Ver publicaciones</Link>
        </div>
    );
}

/** Formulario de contacto con validación. Demostración: el mensaje no se envía a ningún servidor. */
export function ContactoPage() {
    const [v, setV] = useState({ nombre: '', correo: '', mensaje: '' });
    const [estado, setEstado] = useState({ mensaje: '', tipo: 'danger' });
    const cambiar = campo => e => setV(x => ({ ...x, [campo]: e.target.value }));

    function enviar(e) {
        e.preventDefault();
        const error = primerError(validarNombre(v.nombre, 'El nombre'), validarCorreo(v.correo), validarMensaje(v.mensaje.trim()));
        if (error) { setEstado({ mensaje: error, tipo: 'danger' }); return; }
        setEstado({ mensaje: '¡Gracias! Recibimos tu mensaje y te responderemos pronto.', tipo: 'success' });
        setV({ nombre: '', correo: '', mensaje: '' });
    }

    return (
        <div className="container py-4" style={{ maxWidth: 640 }}>
            <h1 className="h2 mb-3">Contacto</h1>
            <p className="text-secondary">¿Tienes una consulta general? Escríbenos. Para problemas con tu cuenta usa el <Link to="/soporte">centro de soporte</Link>.</p>
            <form onSubmit={enviar} noValidate aria-label="Formulario de contacto">
                <Alert mensaje={estado.mensaje} tipo={estado.tipo} />
                <div className="mb-3"><label htmlFor="ctNombre" className="form-label">Nombre</label><input id="ctNombre" className="form-control" value={v.nombre} onChange={cambiar('nombre')} /></div>
                <div className="mb-3"><label htmlFor="ctCorreo" className="form-label">Correo</label><input id="ctCorreo" type="email" className="form-control" value={v.correo} onChange={cambiar('correo')} /></div>
                <div className="mb-3"><label htmlFor="ctMensaje" className="form-label">Mensaje</label><textarea id="ctMensaje" className="form-control" rows={5} value={v.mensaje} onChange={cambiar('mensaje')} /></div>
                <button type="submit" className="btn btn-primary">Enviar</button>
            </form>
        </div>
    );
}

export function NoEncontradaPage() {
    return (
        <div className="container py-5 text-center">
            <h1 className="display-5">404</h1>
            <p className="text-secondary">La página que buscas no existe.</p>
            <Link to="/" className="btn btn-primary">Ir al inicio</Link>
        </div>
    );
}
