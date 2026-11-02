package api.com.v1.config;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import api.com.v1.model.Rol;
import api.com.v1.model.Usuario;
import api.com.v1.repository.UsuarioRepository;

/**
 * Crea el superusuario predeterminado al iniciar la API si todavía no existe.
 *
 * - Las credenciales salen de {@code superusuario.*} (variables SUPERUSUARIO_*), con valores por defecto
 *   pensados solo para desarrollo local. En producción define SUPERUSUARIO_CONTRASENA.
 * - Nunca modifica una cuenta existente: si el correo ya está registrado como usuario normal,
 *   solo avisa en el log (no se ascienden cuentas ajenas en silencio).
 */
@Component
public class SuperusuarioInicializador implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperusuarioInicializador.class);
    static final String CONTRASENA_PREDETERMINADA = "Admin12345";

    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${superusuario.habilitado:true}")
    private boolean habilitado;
    @Value("${superusuario.correo:admin@marketroad.local}")
    private String correo;
    @Value("${superusuario.contrasena:" + CONTRASENA_PREDETERMINADA + "}")
    private String contrasena;
    @Value("${superusuario.nombre:Super}")
    private String nombre;
    @Value("${superusuario.apellido:Usuario}")
    private String apellido;
    @Value("${superusuario.apodo:superadmin}")
    private String apodo;

    @Override
    public void run(ApplicationArguments args) {
        if (!habilitado) {
            log.info("Superusuario predeterminado deshabilitado (superusuario.habilitado=false)");
            return;
        }

        Optional<Usuario> existente = usuarioRepository.findByCorreo(correo);
        if (existente.isPresent()) {
            if (existente.get().getRol() != Rol.SUPERUSUARIO) {
                log.warn("El correo {} ya existe como usuario normal; no se convierte en superusuario. "
                        + "Usa otro SUPERUSUARIO_CORREO o cambia el rol manualmente en la base de datos.", correo);
            }
            return;
        }

        Usuario superusuario = new Usuario();
        superusuario.setNombre(nombre);
        superusuario.setApellido(apellido);
        // El apodo es único: si ya lo tomó otra cuenta, el superusuario se crea sin apodo.
        superusuario.setApodo(usuarioRepository.existsByApodo(apodo) ? null : apodo);
        superusuario.setCorreo(correo);
        superusuario.setContrasena(passwordEncoder.encode(contrasena));
        superusuario.setRol(Rol.SUPERUSUARIO);
        usuarioRepository.save(superusuario);

        log.info("Superusuario predeterminado creado: {}", correo);
        if (CONTRASENA_PREDETERMINADA.equals(contrasena)) {
            log.warn("El superusuario usa la contraseña predeterminada de desarrollo. "
                    + "Define SUPERUSUARIO_CONTRASENA (y cámbiala) antes de desplegar.");
        }
    }
}
