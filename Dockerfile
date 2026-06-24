# PiGallery2 (홈랩 커스텀 fork) — 로컬 소스에서 직접 빌드하는 Dockerfile.
# 공식 selfcontained 이미지는 upstream을 git clone 하므로, fork에는 이 파일을 쓴다.
# build context = 저장소 루트.  사용: docker build -t pigallery2-custom .

#-----------------BUILDER-----------------
FROM node:22-trixie AS builder
ENV SHARP_FORCE_GLOBAL_LIBVIPS=1

# sharp(libvips)·빌드 도구
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl python3 git build-essential pkg-config libvips-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /build
# 의존성 레이어 캐시를 위해 package 파일 먼저 복사
COPY package.json package-lock.json ./
RUN npm install --unsafe-perm

# 나머지 소스 복사 후 릴리스 번들 생성 (.dockerignore 가 node_modules/컴파일물 제외)
COPY . .
RUN mkdir -p /build/release/data/config \
      /build/release/data/db \
      /build/release/data/images \
      /build/release/data/tmp \
  && npm run create-release

# debian 의 libvips 에 맞춰 sharp 재빌드
WORKDIR /build/release
RUN npm install --unsafe-perm --no-package-lock node-addon-api@8.5.0 node-gyp@11.5.0

#-----------------MAIN--------------------
FROM node:22-trixie-slim AS main
WORKDIR /app
ENV NODE_ENV=production \
    default-Database-dbFolder=/app/data/db \
    default-Media-folder=/app/data/images \
    default-Media-tempFolder=/app/data/tmp \
    default-Extensions-folder=/app/data/config/extensions \
    PI_DOCKER=true

EXPOSE 80
ARG TARGETARCH
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget ffmpeg libvips42 \
    && if [ "$TARGETARCH" = "amd64" ]; then \
         apt-get install -y --no-install-recommends intel-media-va-driver; \
       fi \
    && apt-get clean -q -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/release /app

# 빌드 직후 동작 진단
RUN ["node", "--expose-gc", "./src/backend/index", "--run-diagnostics", "--config-path=/app/diagnostics-config.json", "--Server-Log-level=silly"]
HEALTHCHECK --interval=40s --timeout=30s --retries=3 --start-period=60s \
  CMD wget --quiet --tries=1 --no-check-certificate --spider http://127.0.0.1:80/heartbeat || exit 1

ENTRYPOINT ["node", "--expose-gc", "./src/backend/index", "--config-path=/app/data/config/config.json"]
