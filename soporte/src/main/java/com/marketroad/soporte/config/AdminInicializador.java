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
 * Crea el administrador inicial del panel de soporte si todavía no existe, para poder entrar la primera vez
 * y crear al resto del equipo. Nunca modifica una cuenta existente.
 */
@Component
public class AdminInicializador implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminInicializador.class);
    static final String CONTRASENA_PREDETERMINADA = "Soporte12345";

    @Autowired
    private PersonalSoporteRepository personal;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${soporte.admin.habilitado:true}")
    private boolean habilitado;
    @Value("${soporte.admin.correo:soporte-admin@marketroad.local}")
    private String correo;
    @Value("${soporte.admin.contrasena:" + CONTRASENA_PREDETERMINADA + "}")
    private String contrasena;
    @Value("${soporte.admin.nombre:Administrador de soporte}")
    private String nombre;

    @Override
    public void run(ApplicationArguments args) {
        if (!habilitado) {
            log.info("Administrador inicial de soporte deshabilitado (soporte.admin.habilitado=false)");
            return;
        }
        String correoNormalizado = ReglasTicket.normalizarCorreo(correo);
        if (personal.existsByCorreo(correoNormalizado)) {
            return;
        }
        ReglasTicket.validarContrasena(contrasena);

        PersonalSoporte admin = new PersonalSoporte();
        admin.setNombre(ReglasTicket.normalizarNombre(nombre));
        admin.setCorreo(correoNormalizado);
        admin.setContrasenaHash(passwordEncoder.encode(contrasena));
        admin.setRol(RolPersonal.ADMIN);
        personal.save(admin);

        log.info("Administrador inicial de soporte creado: {}", correoNormalizado);
        if (CONTRASENA_PREDETERMINADA.equals(contrasena)) {
            log.warn("El administrador de soporte usa la contraseña predeterminada de desarrollo. "
                    + "Define SOPORTE_ADMIN_CONTRASENA (y cámbiala) antes de desplegar.");
        }
    }
}
