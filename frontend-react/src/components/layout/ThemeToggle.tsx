import { useEffect, useState } from 'react';

const CLAVE = 'mr_theme';

function temaInicial() {
    try {
        const guardado = localStorage.getItem(CLAVE);
        if (guardado === 'dark' || guardado === 'light') return guardado;
    } catch { /* sin acceso al almacenamiento */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
    const [tema, setTema] = useState(temaInicial);
    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', tema);
        try { localStorage.setItem(CLAVE, tema); } catch { /* sin acceso al almacenamiento */ }
    }, [tema]);
    const oscuro = tema === 'dark';
    return (
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setTema(oscuro ? 'light' : 'dark')}
            aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} aria-pressed={oscuro}>
            {oscuro ? '☀️ Claro' : '🌙 Oscuro'}
        </button>
    );
}
