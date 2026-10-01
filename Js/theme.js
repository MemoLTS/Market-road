"use strict";
function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('theme', tema);
    const icono = document.getElementById('icono-tema');
    if (icono)
        icono.textContent = tema === 'dark' ? '☀️' : '🌙';
}
function iniciarTema() {
    const guardado = localStorage.getItem('theme');
    const sistemaOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    aplicarTema(guardado === 'dark' || guardado === 'light' ? guardado : sistemaOscuro ? 'dark' : 'light');
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
        aplicarTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
}
document.addEventListener('DOMContentLoaded', iniciarTema);
