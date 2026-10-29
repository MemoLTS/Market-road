package com.marketroad.soporte.service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketroad.soporte.dto.CargaPersonalDTO;
import com.marketroad.soporte.dto.EstadisticasDTO;
import com.marketroad.soporte.model.CategoriaTicket;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.PrioridadTicket;
import com.marketroad.soporte.reglas.ReglasTicket;
import com.marketroad.soporte.repository.PersonalSoporteRepository;
import com.marketroad.soporte.repository.TicketRepository;
import com.marketroad.soporte.security.IdentidadPersonal;

@Service
public class EstadisticasService {
    @Autowired
    private TicketRepository tickets;
    @Autowired
    private PersonalSoporteRepository personal;

    @Transactional(readOnly = true)
    public EstadisticasDTO obtener(IdentidadPersonal yo) {
        yo.exigirAdmin();

        // Se informan todos los valores posibles (con 0) para que el panel no tenga que
        // adivinar los que faltan.
        Map<String, Long> porEstado = new LinkedHashMap<>();
        for (EstadoTicket e : EstadoTicket.values())
            porEstado.put(e.name(), 0L);
        Map<String, Long> porCategoria = new LinkedHashMap<>();
        for (CategoriaTicket c : CategoriaTicket.values())
            porCategoria.put(c.name(), 0L);
        Map<String, Long> porPrioridad = new LinkedHashMap<>();
        for (PrioridadTicket p : PrioridadTicket.values())
            porPrioridad.put(p.name(), 0L);

        long total = 0;
        for (Object[] fila : tickets.contarPorEstado()) {
            long cantidad = (Long) fila[1];
            porEstado.put(((EstadoTicket) fila[0]).name(), cantidad);
            total += cantidad;
        }
        for (Object[] fila : tickets.contarPorCategoria()) {
            porCategoria.put(((CategoriaTicket) fila[0]).name(), (Long) fila[1]);
        }
        for (Object[] fila : tickets.contarPorPrioridad()) {
            porPrioridad.put(((PrioridadTicket) fila[0]).name(), (Long) fila[1]);
        }

        Map<Long, Long> carga = new HashMap<>();
        for (Object[] fila : tickets.cargaPorPersonal(ReglasTicket.ESTADOS_QUE_OCUPAN_CUPO)) {
            carga.put((Long) fila[0], (Long) fila[1]);
        }
        List<CargaPersonalDTO> cargaPersonal = new ArrayList<>();
        long activos = 0;
        for (PersonalSoporte p : personal.findAllByOrderByNombreAsc()) {
            if (p.isActivo()) {
                activos++;
                cargaPersonal.add(new CargaPersonalDTO(p.getId(), p.getNombre(), carga.getOrDefault(p.getId(), 0L)));
            }
        }
        cargaPersonal.sort(Comparator.comparingLong(CargaPersonalDTO::ticketsEnCurso).reversed());

        long sinAsignar = tickets.countByAsignadoIdIsNullAndEstadoIn(ReglasTicket.ESTADOS_QUE_OCUPAN_CUPO);
        long ultimos7 = tickets.countByFechaCreacionAfter(OffsetDateTime.now().minusDays(7));
        return new EstadisticasDTO(total, sinAsignar, ultimos7, activos, porEstado, porCategoria, porPrioridad,
                cargaPersonal);
    }
}
