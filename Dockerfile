FROM node:24-bookworm-slim AS web-build
WORKDIR /build/web
COPY web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM node:24-bookworm-slim AS server-build
WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=8620 RD_DB=/data/roamdial.db
WORKDIR /app
COPY --from=server-build /build/server/node_modules ./server/node_modules
COPY server/*.js server/package.json ./server/
COPY --from=web-build /build/web/dist ./web/dist
COPY data/stations.json.gz ./data/stations.json.gz
COPY deploy/entrypoint.sh /usr/local/bin/roamdial-entrypoint
RUN mkdir -p /data && chmod +x /usr/local/bin/roamdial-entrypoint
# 以 root 运行：NAS 数据共享目录的属主不可控（fnOS 创建的 share 目录
# 常为 root 或包用户所有），非 root 会 SQLITE_CANTOPEN 写不了 /data。
VOLUME /data
EXPOSE 8620
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:8620/api/health').then(r=>{if(!r.ok)process.exit(1);return r.json()}).then(j=>{if(!j.ok||j.stations<1)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["roamdial-entrypoint"]
