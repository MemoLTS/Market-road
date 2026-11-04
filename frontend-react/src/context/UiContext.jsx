import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import LoginForm from '../components/auth/LoginForm.jsx';
import RegisterForm from '../components/auth/RegisterForm.jsx';
import Modal from '../components/common/Modal.jsx';

const UiContext = createContext({ abrirLogin: () => {}, abrirRegistro: () => {} });

/** Controla los modales de acceso para que cualquier componente pueda pedir "inicia sesión". */
export function UiProvider({ children }) {
    const [modal, setModal] = useState(null); // 'login' | 'registro' | null
    const cerrar = useCallback(() => setModal(null), []);
    const valor = useMemo(() => ({
        abrirLogin: () => setModal('login'),
        abrirRegistro: () => setModal('registro'),
    }), []);
    return (
        <UiContext.Provider value={valor}>
            {children}
            <Modal abierto={modal === 'login'} titulo="Iniciar sesión" onCerrar={cerrar}>
                <LoginForm onExito={cerrar} onIrARegistro={() => setModal('registro')} />
            </Modal>
            <Modal abierto={modal === 'registro'} titulo="Crear cuenta" onCerrar={cerrar}>
                <RegisterForm onExito={cerrar} />
            </Modal>
        </UiContext.Provider>
    );
}

export const useUi = () => useContext(UiContext);
