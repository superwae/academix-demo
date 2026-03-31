# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY AcademixLMS.sln ./
COPY AcademixLMS.API/AcademixLMS.API.csproj ./AcademixLMS.API/
COPY AcademixLMS.Application/AcademixLMS.Application.csproj ./AcademixLMS.Application/
COPY AcademixLMS.Domain/AcademixLMS.Domain.csproj ./AcademixLMS.Domain/
COPY AcademixLMS.Infrastructure/AcademixLMS.Infrastructure.csproj ./AcademixLMS.Infrastructure/

# Restore dependencies
RUN dotnet restore AcademixLMS.sln

# Copy all source files
COPY . .

# Build and publish
WORKDIR /src/AcademixLMS.API
RUN dotnet publish -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create logs directory
RUN mkdir -p /app/logs

# Copy published files
COPY --from=build /app/publish .

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run the application
ENTRYPOINT ["dotnet", "AcademixLMS.API.dll"]

