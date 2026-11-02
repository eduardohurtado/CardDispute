
# =========================================
# BUILD STAGE - MAVEN + JAVA 17
# =========================================
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy Maven configuration
COPY pom.xml ./

# Download project dependencies
RUN mvn -B dependency:go-offline

# Copy application source code
COPY src ./src

# Normalize Java source line endings to LF
# before running Maven and Spotless
RUN find src -type f -name "*.java" \
    -exec sed -i 's/\r$//' {} +

# Package the application
RUN mvn -B -DskipTests package \
    org.springframework.boot:spring-boot-maven-plugin:3.5.16:repackage

# =========================================
# RUNTIME STAGE - JAVA 17
# =========================================
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy executable JAR
COPY --from=build \
    /app/target/card-dispute-application-1.0-SNAPSHOT.jar \
    /app/app.jar

# Application HTTP port
EXPOSE 8080

# Start Spring Boot
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
