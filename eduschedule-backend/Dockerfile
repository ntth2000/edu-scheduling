# syntax=docker/dockerfile:1

# ---- Stage 1: build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache deps first for faster rebuilds
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests \
 && mv target/*.jar app.jar

# ---- Stage 2: runtime ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=build /app/app.jar /app/app.jar

# Most PaaS platforms (Render, Railway, Heroku, Cloud Run, Fly.io) inject PORT;
# default to 8080 when running the image locally or on a plain VPS.
ENV PORT=8080
EXPOSE 8080

# The image ships only application-prod.properties, so the prod profile must be active.
# Set here rather than on the platform dashboard so the image is self-contained.
ENV SPRING_PROFILES_ACTIVE=prod

# JVM tuned for 512MB containers:
#  - MaxRAMPercentage caps heap at ~70% of container memory
#  - SerialGC is lightest for small heaps
#  - Disable JIT tiered compilation level 4 to save memory during warmup
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70.0 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar --server.port=${PORT}"]
