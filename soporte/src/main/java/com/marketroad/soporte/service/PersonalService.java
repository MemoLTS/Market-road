package com.marketroad.soporte.service;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketroad.soporte.dto.ActualizarPersonalRequestDTO;
import com.marketroad.soporte.dto.CambiarContrasenaRequestDTO;
import com.marketroad.soporte.dto.CrearPersonalRequestDTO;
import com.marketroad.soporte.dto.LoginRequestDTO;
import com.marketroad.soporte.dto.LoginResponseDTO;
import com.marketroad.soporte.dto.PersonalDTO;
import com.marketroad.soporte.exception.CredencialesInvalidasException;
import com.marketroad.soporte.exception.OperacionNoPermitidaException;
import com.marketroad.soporte.exception.PersonalNoEncontradoException;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.model.Ticket;
import com.marketroad.soporte.reglas.LimitadorAcciones;
import com.marketroad.soporte.reglas.ReglasTicket;
import com.marketroad.soporte.repository.PersonalSoporteRepository;
import com.marketroad.soporte.repository.TicketRepository;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.security.JwtPersonalUtil;

import jakarta.annotation.PostConstruct;

/** Cuentas del equipo de soporte: login, contraseña propia y gestión del equipo (solo ADMIN). */
@Service
public class PersonalService {
    private static final String MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos";

    @Autowired
    private PersonalSoporteRepository personal;
    @Autowired
    private TicketRepository tickets;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtPersonalUtil jwt;
    @Autowired
    @Qualifier("limitadorLogin")
    private LimitadorAcciones limitadorLogin;

    /** Hash de relleno: se compara cuando el correo no existe para que responder tarde lo mismo que con una cuenta real. */
    private String hashRelleno;

    @PostConstruct
    public void inicializar() {
        this.hashRelleno = passwordEncoder.encode("relleno-" + System.nanoTime());
    }

    // ---------- Sesión ----------

    @Transactional
    public LoginResponseDTO login(LoginRequestDTO body) {
        String correo;
        try {
            correo = ReglasTicket.normalizarCorreo(body.correo());
        } catch (IllegalArgumentException ex) {
            throw new CredencialesInvalidasException(MENSAJE_CREDENCIALES);
        }
        limitadorLogin.verificar(correo);

        PersonalSoporte cuenta = personal.findByCorreo(correo).orElse(null);
        boolean coincide = passwordEncoder.matches(body.contrasena(), cuenta == null ? hashRelleno : cuenta.getContrasenaHash());
        if (cuenta == null || !coincide || !cuenta.isActivo()) {
            limitadorLogin.anotar(correo);
            throw new CredencialesInvalidasException(MENSAJE_CREDENCIALES);
        }
        limitadorLogin.reiniciar(correo);
        cuenta.setUltimoAcceso(OffsetDateTime.now());
        return new LoginResponseDTO(jwt.generarToken(cuenta.getId()), jwt.getExpiracionMs(), aDTO(cuenta, 0));
    }

    @Transactional(readOnly = true)
    public PersonalDTO yo(IdentidadPersonal yo) {
        return aDTO(buscar(yo.personalId()), 0);
    }

    @Transactional
    public void cambiarContrasenaPropia(IdentidadPersonal yo, CambiarContrasenaRequestDTO body) {
        PersonalSoporte cuenta = buscar(yo.personalId());
        limitadorLogin.verificar("c:" + yo.personalId());
        if (!passwordEncoder.matches(body.actual(), cuenta.getContrasenaHash())) {
            limitadorLogin.anotar("c:" + yo.personalId());
            // 400 y no 401: un 401 haría creer al panel que la sesión expiró y lo sacaría.
            throw new IllegalArgumentException("La contraseña actual no es correcta");
        }
        ReglasTicket.validarContrasena(body.nueva());
        cuenta.setContrasenaHash(passwordEncoder.encode(body.nueva()));
        limitadorLogin.reiniciar("c:" + yo.personalId());
    }

    // ---------- Gestión del equipo (ADMIN) ----------

    @Transactional(readOnly = true)
    public List<PersonalDTO> listar(IdentidadPersonal yo) {
        yo.exigirAdmin();
        Map<Long, Long> carga = new HashMap<>();
        for (Object[] fila : tickets.cargaPorPersonal(ReglasTicket.ESTADOS_QUE_OCUPAN_CUPO)) {
            carga.put((Long) fila[0], (Long) fila[1]);
        }
        return personal.findAllByOrderByNombreAsc().stream()
                .map(p -> aDTO(p, carga.getOrDefault(p.getId(), 0L))).toList();
    }

    @Transactional
    public PersonalDTO crear(IdentidadPersonal yo, CrearPersonalRequestDTO body) {
        yo.exigirAdmin();
        String correo = ReglasTicket.normalizarCorreo(body.correo());
        if (personal.existsByCorreo(correo)) {
            throw new OperacionNoPermitidaException("Ya existe una cuenta de soporte con ese correo");
        }
        ReglasTicket.validarContrasena(body.contrasena());

        PersonalSoporte cuenta = new PersonalSoporte();
        cuenta.setNombre(ReglasTicket.normalizarNombre(body.nombre()));
        cuenta.setCorreo(correo);
        cuenta.setContrasenaHash(passwordEncoder.encode(body.contrasena()));
        cuenta.setRol(RolPersonal.desdeCodigo(body.rol()));
        personal.save(cuenta);
        return aDTO(cuenta, 0);
    }

    @Transactional
    public PersonalDTO actualizar(IdentidadPersonal yo, Long id, ActualizarPersonalRequestDTO body) {
        yo.exigirAdmin();
        PersonalSoporte cuenta = buscar(id);
        boolean esUnoMismo = yo.personalId().equals(cuenta.getId());

        RolPersonal nuevoRol = body.rol() == null ? cuenta.getRol() : RolPersonal.desdeCodigo(body.rol());
        boolean nuevoActivo = body.activo() == null ? cuenta.isActivo() : body.activo();

        if (esUnoMismo && (!nuevoActivo || nuevoRol != RolPersonal.ADMIN)) {
            throw new OperacionNoPermitidaException("No puedes desactivar tu propia cuenta ni quitarte el rol de administrador");
        }
        boolean eraAdminActivo = cuenta.getRol() == RolPersonal.ADMIN && cuenta.isActivo();
        boolean seguiraAdminActivo = nuevoRol == RolPersonal.ADMIN && nuevoActivo;
        if (eraAdminActivo && !seguiraAdminActivo && personal.countByRolAndActivoTrue(RolPersonal.ADMIN) <= 1) {
            throw new OperacionNoPermitidaException("Debe quedar al menos un administrador de soporte activo");
        }

        if (body.nombre() != null) {
            cuenta.setNombre(ReglasTicket.normalizarNombre(body.nombre()));
        }
        if (body.contrasena() != null && !body.contrasena().isEmpty()) {
            ReglasTicket.validarContrasena(body.contrasena());
            cuenta.setContrasenaHash(passwordEncoder.encode(body.contrasena()));
        }
        cuenta.setRol(nuevoRol);
        if (cuenta.isActivo() && !nuevoActivo) {
            liberarTickets(cuenta);
        }
        cuenta.setActivo(nuevoActivo);
        return aDTO(cuenta, 0);
    }

    /** Al desactivar una cuenta, sus tickets no cerrados vuelven a la cola para que otra persona los tome. */
    private void liberarTickets(PersonalSoporte cuenta) {
        for (Ticket t : tickets.findByAsignadoIdAndEstadoNot(cuenta.getId(), EstadoTicket.CERRADO)) {
            t.setAsignadoId(null);
            if (t.getEstado() == EstadoTicket.EN_PROGRESO) {
                t.setEstado(EstadoTicket.ABIERTO);
            }
        }
    }

    private PersonalSoporte buscar(Long id) {
        return personal.findById(id).orElseThrow(() -> new PersonalNoEncontradoException("La persona indicada no existe"));
    }

    private PersonalDTO aDTO(PersonalSoporte p, long ticketsEnCurso) {
        return new PersonalDTO(p.getId(), p.getNombre(), p.getCorreo(), p.getRol().name(), p.getRol().getNombre(),
                p.isActivo(), p.getFechaCreacion(), p.getUltimoAcceso(), ticketsEnCurso);
    }
}
