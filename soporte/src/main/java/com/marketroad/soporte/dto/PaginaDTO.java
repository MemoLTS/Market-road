package com.marketroad.soporte.dto;

import java.util.List;

public record PaginaDTO<T>(List<T> contenido, int pagina, int tamano, long totalElementos, int totalPaginas) {}
