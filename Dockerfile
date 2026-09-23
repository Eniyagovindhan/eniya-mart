# =============================================================
# ENIYA MART - Railway / cloud deployment image
# Multi-stage build: Maven 3.9 + JDK 17  ->  slim JRE 17 runtime
# The frontend folder is bundled into the jar as static resources,
# so Spring Boot serves the site and the API from one container.
# =============================================================

# ---------------------------- build stage ----------------------------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# Cache dependency downloads separately from source changes
COPY backend/pom.xml backend/pom.xml
RUN mvn -f backend/pom.xml -B -q dependency:go-offline

COPY backend/src backend/src
COPY frontend frontend
RUN mvn -f backend/pom.xml -B -q -DskipTests package

# ---------------------------- runtime stage --------------------------
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

COPY --from=build /build/backend/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70.0", "-jar", "app.jar"]
