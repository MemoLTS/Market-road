package api.com.v1.security;

import java.io.IOException;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import api.com.v1.model.Rol;
import api.com.v1.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Autorización de las rutas de /api/v1/usuarios que JwtAuthFilter solo autentica.
 *
 * <ul>
 *   <li>DELETE /usuarios/{id}: solo la propia persona o un superusuario (antes cualquier cuenta con sesión
 *       podía borrar a cualquier otra).</li>
 *   <li>GET /usuarios: solo superusuario (devolvía los correos de todas las cuentas a cualquier persona
 *       con sesión; el listado administrativo está en /admin/usuarios).</li>
 *   <li>GET /usuarios/{id}: solo la propia persona o un superusuario.</li>
 * </ul>
 *
 * Corre después de JwtAuthFilter (Order 1), que es quien deja el atributo "usuarioAutenticadoId".
 */
@Component
@Order(2)
public class ControlAccesoUsuariosFilter extends HttpFilter {

    private static final String RUTA_USUARIOS = "/api/v1/usuarios";
    private static final Pattern RUTA_USUARIO_POR_ID = Pattern.compile("/api/v1/usuarios/(\\d+)");

    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private ObjectMapper objectMapper;

    @Override
    protected void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        String metodo = request.getMethod();
        String path = request.getRequestURI();
        Object atributo = request.getAttribute("usuarioAutenticadoId");

        // Sin atributo la ruta es pública o JwtAuthFilter ya respondió 401: no hay nada que autorizar aquí.
        if (!(atributo instanceof Long) || !(metodo.equals("GET") || metodo.equals("DELETE"))) {
            chain.doFilter(request, response);
            return;
        }
        Long autenticadoId = (Long) atributo;

        if (metodo.equals("GET") && RUTA_USUARIOS.equals(path)) {
            if (!esSuperusuario(autenticadoId)) {
                prohibir(response, "Acceso restringido al superusuario");
                return;
            }
        } else {
            var coincidencia = RUTA_USUARIO_POR_ID.matcher(path);
            if (coincidencia.matches()) {
                Long objetivoId = Long.valueOf(coincidencia.group(1));
                if (!objetivoId.equals(autenticadoId) && !esSuperusuario(autenticadoId)) {
                    prohibir(response, metodo.equals("DELETE")
                            ? "Solo puedes eliminar tu propia cuenta"
                            : "Solo puedes consultar tu propia cuenta");
                    return;
                }
            }
        }
        chain.doFilter(request, response);
    }

    private boolean esSuperusuario(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .map(u -> u.getRol() == Rol.SUPERUSUARIO)
                .orElse(false);
    }

    private void prohibir(HttpServletResponse response, String mensaje) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of("mensaje", mensaje)));
    }
}
