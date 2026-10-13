type Tema = 'dark' | 'light';

function aplicarTema(tema: Tema): void {
    document.documentElement.setAttribute('data-theme', tema);
    document.documentElement.setAttribute('data-bs-theme', tema);
    localStorage.setItem('theme', tema);
    const icono = document.getElementById('icono-tema');
    if (icono) icono.textContent = tema === 'dark' ? '☀️' : '🌙';
}

function iniciarTema(): void {
    const guardado = localStorage.getItem('theme');
    const sistemaOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    aplicarTema(guardado === 'dark' || guardado === 'light' ? guardado : sistemaOscuro ? 'dark' : 'light');

    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
        aplicarTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
}

document.addEventListener('DOMContentLoaded', iniciarTema);
