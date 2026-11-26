import { useEffect } from 'react';
import Footer from './components/layout/Footer';
import Navbar from './components/layout/Navbar';
import RutaProtegida from './components/layout/RutaProtegida';
import Alert from './components/common/Alert';
import { config } from './config';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UiProvider } from './context/UiContext';
import { tomarDestino } from './core/destino';
import { Link, Route, Router, Routes, useNavigate } from './core/router';
import AdminPage from './pages/AdminPage';
import { CategoriaPage, CategoriasPage } from './pages/CategoriasPage';
import HomePage from './pages/HomePage';
import MensajesPage from './pages/MensajesPage';
import PerfilPage from './pages/PerfilPage';
import PublicationDetailPage from './pages/PublicationDetailPage';
import SoportePage from './pages/SoportePage';
import SoportePanelPage from './pages/SoportePanelPage';
import { ContactoPage, NoEncontradaPage, NosotrosPage } from './pages/StaticPages';

/** Tras iniciar sesión lleva a la página protegida que se había pedido (si la hay y sigue vigente). */
function RetornoTrasLogin() {
    const { autenticado } = useAuth();
    const navegar = useNavigate();
    useEffect(() => {
        if (!autenticado) return;
        const destino = tomarDestino();
        if (destino) navegar(destino, { reemplazar: true });
    }, [autenticado, navegar]);
    return null;
}

function Avisos() {
    const { aviso, limpiarAviso } = useAuth();
    return aviso ? <div className="container pt-3"><Alert mensaje={aviso} tipo="warning" onCerrar={limpiarAviso} /></div> : null;
}

/** Cuenta deshabilitada por la administración: solo se puede usar el soporte. */
function AvisoCuentaDeshabilitada() {
    const { deshabilitada } = useAuth();
    return deshabilitada
        ? <div className="alert alert-danger rounded-0 mb-0 text-center py-2" role="alert" data-testid="aviso-deshabilitada">Tu cuenta está deshabilitada: solo puedes usar el soporte. <Link to="/soporte" className="alert-link">Escribir a soporte</Link></div>
        : null;
}

/** Aviso fijo en modo demostración: ahí los datos viven en el navegador y NO llegan a Spring Boot ni a MySQL. */
function AvisoModoDemo() {
    return config.usarMock
        ? <div className="alert alert-warning rounded-0 mb-0 text-center py-2" role="status" data-testid="aviso-demo">Modo demostración: los datos se guardan solo en este navegador, no en la base de datos.</div>
        : null;
}

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <UiProvider>
                    <div className="d-flex flex-column min-vh-100">
                        <RetornoTrasLogin />
                        <AvisoModoDemo />
                        <Navbar />
                        <AvisoCuentaDeshabilitada />
                        <Avisos />
                        <main className="flex-grow-1">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/categorias" element={<CategoriasPage />} />
                                <Route path="/categorias/:codigo" element={<CategoriaPage />} />
                                <Route path="/publicaciones/:id" element={<PublicationDetailPage />} />
                                <Route path="/nosotros" element={<NosotrosPage />} />
                                <Route path="/contacto" element={<ContactoPage />} />
                                <Route path="/soporte" element={<SoportePage />} />
                                <Route path="/soporte-panel" element={<SoportePanelPage />} />
                                <Route path="/perfil" element={<RutaProtegida><PerfilPage /></RutaProtegida>} />
                                <Route path="/mensajes" element={<RutaProtegida><MensajesPage /></RutaProtegida>} />
                                <Route path="/mensajes/:id" element={<RutaProtegida><MensajesPage /></RutaProtegida>} />
                                <Route path="/admin" element={<RutaProtegida admin><AdminPage /></RutaProtegida>} />
                                <Route path="*" element={<NoEncontradaPage />} />
                            </Routes>
                        </main>
                        <Footer />
                    </div>
                </UiProvider>
            </AuthProvider>
        </Router>
    );
}
