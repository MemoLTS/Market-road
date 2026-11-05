package com.marketroad.soporte;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

import org.junit.jupiter.api.Test;

class SoporteApplicationTest {
    @Test
    void mainMethodIsPublicStatic() throws Exception {
        Method method = SoporteApplication.class.getDeclaredMethod("main", String[].class);

        assertEquals(void.class, method.getReturnType());
        assertTrue(Modifier.isStatic(method.getModifiers()));
        assertTrue(Modifier.isPublic(method.getModifiers()));
    }
}
