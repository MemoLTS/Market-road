package com.pruebas.unitarias.main;
import static org.mockito.Mockito.mockStatic;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.boot.SpringApplication;
import com.caso3.inventario.Inventario;
class InventarioTest {
        @Test
        void testMain() {
                try (MockedStatic<SpringApplication> spring =
                        mockStatic(SpringApplication.class)) {
                Inventario.main(new String[] {});
                spring.verify(() ->
                        SpringApplication.run(Inventario.class, new String[] {}));
                }
        }
}