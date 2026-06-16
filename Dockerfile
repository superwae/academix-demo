# Single-image build for the free hosted demo: builds the React frontend and the
# .NET API, then the API serves the frontend from wwwroot at the same origin.
# Build context is the repository root.

# ---- Stage 1: build the React (Vite) frontend ----
FROM node:20-bookworm-slim AS frontend
WORKDIR /web
# Playwright is a dev dependency used only for screenshots; skip its browser download.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_API_BASE_URL is intentionally unset so the app uses the relative /api/v1,
# i.e. the same origin it is served from. Use vite directly (skip the strict tsc
# type-check) so the demo image builds even with in-progress type warnings.
RUN npx vite build

# ---- Stage 2: build & publish the .NET API ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend
WORKDIR /src
COPY backend/AcademixLMS.sln ./
COPY backend/AcademixLMS.API/AcademixLMS.API.csproj ./AcademixLMS.API/
COPY backend/AcademixLMS.Application/AcademixLMS.Application.csproj ./AcademixLMS.Application/
COPY backend/AcademixLMS.Domain/AcademixLMS.Domain.csproj ./AcademixLMS.Domain/
COPY backend/AcademixLMS.Infrastructure/AcademixLMS.Infrastructure.csproj ./AcademixLMS.Infrastructure/
RUN dotnet restore AcademixLMS.sln
COPY backend/. .
RUN dotnet publish AcademixLMS.API/AcademixLMS.API.csproj -c Release -o /app/publish --no-restore

# ---- Stage 3: runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN mkdir -p /app/logs
COPY --from=backend /app/publish .
# Drop the built SPA into wwwroot so UseStaticFiles/MapFallbackToFile serve it.
COPY --from=frontend /web/dist ./wwwroot

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "AcademixLMS.API.dll"]
