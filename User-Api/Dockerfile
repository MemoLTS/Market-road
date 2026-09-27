# Etapa 1: Compilar con JDK 21 (Lombok es 100% compatible)
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: Ejecutar sobre el entorno JRE 25
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-Dspring.classformat.ignore=true", "-jar", "app.jar"]