import Footer from './components/layout/Footer.jsx';
import Navbar from './components/layout/Navbar.jsx';
import RutaProtegida from './components/layout/RutaProtegida.jsx';
import Alert from './components/common/Alert.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import { Route, Router, Routes } from './core/router.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { CategoriaPage, CategoriasPage } from './pages/CategoriasPage.jsx';
import HomePage from './pages/HomePage.jsx';
import MensajesPage from './pages/MensajesPage.jsx';
import PerfilPage from './pages/PerfilPage.jsx';
import PublicationDetailPage from './pages/PublicationDetailPage.jsx';
import SoportePage from './pages/SoportePage.jsx';
import SoportePanelPage from './pages/SoportePanelPage.jsx';
import { ContactoPage, NoEncontradaPage, NosotrosPage } from './pages/StaticPages.jsx';

function Avisos() {
    const { aviso, limpiarAviso } = useAuth();
    return aviso ? <div className="container pt-3"><Alert mensaje={aviso} tipo="warning" onCerrar={limpiarAviso} /></div> : null;
}

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <UiProvider>
                    <div className="d-flex flex-column min-vh-100">
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
