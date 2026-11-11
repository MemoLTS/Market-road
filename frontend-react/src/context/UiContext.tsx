import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import Modal from '../components/common/Modal';

export interface ValorUi {
    abrirLogin: () => void;
    abrirRegistro: () => void;
}

const UiContext = createContext<ValorUi>({ abrirLogin: () => {}, abrirRegistro: () => {} });

/** Controla los modales de acceso para que cualquier componente pueda pedir "inicia sesión". */
export function UiProvider({ children }: { children: ReactNode }) {
    const [modal, setModal] = useState<'login' | 'registro' | null>(null);
    const cerrar = useCallback(() => setModal(null), []);
    const valor = useMemo<ValorUi>(() => ({
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

export const useUi = (): ValorUi => useContext(UiContext);
