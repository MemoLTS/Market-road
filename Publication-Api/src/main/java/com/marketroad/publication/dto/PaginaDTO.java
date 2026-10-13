package com.marketroad.publication.dto;

import java.util.List;

public record PaginaDTO<T>(List<T> contenido, int pagina, int tamano, long total, int totalPaginas) {}
