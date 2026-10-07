# 1) React uygulamasını derle
FROM node:22-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) .NET API'yi yayınla
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY backend/ ./
RUN dotnet publish BenSanaAtarim.Api/BenSanaAtarim.Api.csproj -c Release -o /app /p:UseAppHost=false

# 3) Çalışma imajı: API + derlenmiş React (wwwroot)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=backend /app ./
COPY --from=frontend /src/frontend/dist ./wwwroot
ENV ASPNETCORE_ENVIRONMENT=Production
# Dinlenecek port PORT ortam değişkeniyle verilir (Render), verilmezse imajın varsayılanı (8080) kullanılır.
USER app
ENTRYPOINT ["dotnet", "BenSanaAtarim.Api.dll"]
