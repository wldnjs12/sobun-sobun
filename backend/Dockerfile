# Railway에서 "Root Directory"를 backend로 지정하면 이 Dockerfile을 자동으로 찾아 빌드한다.
# 멀티 스테이지: 빌드 스테이지(JDK 17 + Gradle 캐시) -> 실행 스테이지(JRE 17만, 이미지 가볍게).

FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# 의존성 레이어를 소스 변경과 분리해서 캐시 재사용률을 높인다.
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle .
RUN ./gradlew dependencies --no-daemon || true

COPY src src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

# Railway가 PORT 환경변수로 포트를 주입한다 (application.yml의 server.port: ${PORT:8080} 참고).
ENTRYPOINT ["java", "-jar", "app.jar"]
