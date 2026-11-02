package com.marketroad.soporte.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.reglas.ReglasTicket;
import com.marketroad.soporte.repository.PersonalSoporteRepository;

/**
 * Crea las cuentas iniciales del panel de soporte si todavía no existen, para poder entrar la primera vez:
 * <ul>
 *   <li>un <b>administrador</b> ({@code soporte.admin.*}), que ve todos los tickets y gestiona el equipo;</li>
 *   <li>una cuenta de <b>soporte</b> ({@code soporte.agente.*}), que atiende los tickets sin asignar y los suyos.</li>
 * </ul>
 * Nunca modifica una cuenta existente.
 */
@Component
public class PersonalInicializador implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(PersonalInicializador.class);
    // Deben ser constantes de compilación: se usan como valor por defecto dentro de las anotaciones @Value.
    static final String CONTRASENA_ADMIN_PREDETERMINADA = "Soporte12345";
    static final String CONTRASENA_AGENTE_PREDETERMINADA = "Agente12345";

    @Autowired
    private PersonalSoporteRepository personal;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private ReglasTicket reglas;

    @Value("${soporte.admin.habilitado:true}")
    private boolean adminHabilitado;
    @Value("${soporte.admin.correo:soporte-admin@marketroad.local}")
    private String adminCorreo;
    @Value("${soporte.admin.contrasena:" + CONTRASENA_ADMIN_PREDETERMINADA + "}")
    private String adminContrasena;
    @Value("${soporte.admin.nombre:Administrador de soporte}")
    private String adminNombre;

    @Value("${soporte.agente.habilitado:true}")
    private boolean agenteHabilitado;
    @Value("${soporte.agente.correo:soporte@marketroad.local}")
    private String agenteCorreo;
    @Value("${soporte.agente.contrasena:" + CONTRASENA_AGENTE_PREDETERMINADA + "}")
    private String agenteContrasena;
    @Value("${soporte.agente.nombre:Agente de soporte}")
    private String agenteNombre;

    @Override
    public void run(ApplicationArguments args) {
        crearSiFalta(RolPersonal.ADMIN, adminHabilitado, adminCorreo, adminContrasena, adminNombre,
                CONTRASENA_ADMIN_PREDETERMINADA, "SOPORTE_ADMIN_CONTRASENA", "soporte.admin.habilitado");
        crearSiFalta(RolPersonal.SOPORTE, agenteHabilitado, agenteCorreo, agenteContrasena, agenteNombre,
                CONTRASENA_AGENTE_PREDETERMINADA, "SOPORTE_AGENTE_CONTRASENA", "soporte.agente.habilitado");
    }

    private void crearSiFalta(RolPersonal rol, boolean habilitado, String correo, String contrasena, String nombre,
            String contrasenaPredeterminada, String variableContrasena, String propiedadHabilitado) {
        if (!habilitado) {
            log.info("Cuenta inicial de soporte ({}) deshabilitada ({}=false)", rol, propiedadHabilitado);
            return;
        }
        String correoNormalizado = reglas.normalizarCorreo(correo);
        if (personal.existsByCorreo(correoNormalizado)) {
            return;
        }
        reglas.validarContrasena(contrasena);

        PersonalSoporte cuenta = new PersonalSoporte();
        cuenta.setNombre(reglas.normalizarNombre(nombre));
        cuenta.setCorreo(correoNormalizado);
        cuenta.setContrasenaHash(passwordEncoder.encode(contrasena));
        cuenta.setRol(rol);
        personal.save(cuenta);

        log.info("Cuenta inicial de soporte creada ({}): {}", rol, correoNormalizado);
        if (contrasenaPredeterminada.equals(contrasena)) {
            log.warn("La cuenta de soporte {} usa la contraseña predeterminada de desarrollo. "
                    + "Define {} (y cámbiala) antes de desplegar.", correoNormalizado, variableContrasena);
        }
    }
}
