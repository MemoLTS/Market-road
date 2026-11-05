package api.com.v1;

import static org.mockito.Mockito.mockStatic;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.boot.SpringApplication;

class UserApiTest {

    @Test
    void main_debeEjecutarLaAplicacionSpring() {
        try (MockedStatic<SpringApplication> springApplication = mockStatic(SpringApplication.class)) {
            String[] args = {"--spring.main.web-application-type=none"};

            UserApi.main(args);

            springApplication.verify(() -> SpringApplication.run(UserApi.class, args));
        }
    }
}
