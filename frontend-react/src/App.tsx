import Footer from './components/layout/Footer';
import Navbar from './components/layout/Navbar';
import RutaProtegida from './components/layout/RutaProtegida';
import Alert from './components/common/Alert';
import { config } from './config';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UiProvider } from './context/UiContext';
import { Route, Router, Routes } from './core/router';
import AdminPage from './pages/AdminPage';
import { CategoriaPage, CategoriasPage } from './pages/CategoriasPage';
import HomePage from './pages/HomePage';
import MensajesPage from './pages/MensajesPage';
import PerfilPage from './pages/PerfilPage';
import PublicationDetailPage from './pages/PublicationDetailPage';
import SoportePage from './pages/SoportePage';
import SoportePanelPage from './pages/SoportePanelPage';
import { ContactoPage, NoEncontradaPage, NosotrosPage } from './pages/StaticPages';

function Avisos() {
    const { aviso, limpiarAviso } = useAuth();
    return aviso ? <div className="container pt-3"><Alert mensaje={aviso} tipo="warning" onCerrar={limpiarAviso} /></div> : null;
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
                        <AvisoModoDemo />
                        <Navbar />
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
