import { Link } from '../../core/router';

export default function Footer() {
    return (
        <footer className="site-footer py-4 mt-5 text-secondary small">
            <div className="container d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <span>© 2026 Market-Road · Plataforma de compraventa entre personas.</span>
                <span className="d-flex flex-wrap gap-3">
                    <Link to="/nosotros">Nosotros</Link>
                    <Link to="/contacto">Contacto</Link>
                    <Link to="/soporte">Soporte</Link>
                    <Link to="/soporte-panel">Panel de soporte</Link>
                </span>
            </div>
        </footer>
    );
}
