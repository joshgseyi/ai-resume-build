# Docker Support for AI Resume Builder

This project includes comprehensive Docker support for both development and production environments.

## Quick Start

### Development Environment
```bash
# Start development environment with hot reloading
docker-compose --profile dev up

# Or build and run manually
docker build -f Dockerfile.dev -t resume-app-dev .
docker run -p 3000:3000 -v $(pwd):/app resume-app-dev
```

### Production Environment
```bash
# Start production environment
docker-compose --profile prod up

# Or build and run manually
docker build -t resume-app-prod .
docker run -p 3000:3000 resume-app-prod
```

### Production with Nginx Reverse Proxy
```bash
# Start with nginx reverse proxy
docker-compose --profile nginx up
```

## Docker Files Overview

### `Dockerfile`
- Multi-stage build optimized for production
- Uses Node.js 18 Alpine for smaller image size
- Implements security best practices with non-root user
- Leverages Next.js standalone output for optimal performance

### `Dockerfile.dev`
- Single-stage build for development
- Includes all dependencies for hot reloading
- Volume mounts for live code changes

### `docker-compose.yml`
- Three different profiles for different use cases:
  - `dev`: Development with hot reloading
  - `prod`: Production build
  - `nginx`: Production with nginx reverse proxy

### `nginx.conf`
- Reverse proxy configuration
- Security headers
- Gzip compression
- Health check endpoint

## Environment Variables

You can set environment variables in several ways:

### Using .env file
```bash
# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

### Using docker-compose
```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=https://api.example.com
```

### Using docker run
```bash
docker run -e NODE_ENV=production -p 3000:3000 resume-app-prod
```

## Development Workflow

1. **Start development environment:**
   ```bash
   docker-compose --profile dev up
   ```

2. **Make code changes** - they will be automatically reflected due to volume mounting

3. **View logs:**
   ```bash
   docker-compose --profile dev logs -f
   ```

4. **Stop development environment:**
   ```bash
   docker-compose --profile dev down
   ```

## Production Deployment

### Using Docker Compose
```bash
# Build and start production
docker-compose --profile prod up -d

# With nginx reverse proxy
docker-compose --profile nginx up -d
```

### Using Docker directly
```bash
# Build production image
docker build -t resume-app-prod .

# Run production container
docker run -d -p 3000:3000 --name resume-app resume-app-prod
```

## Docker Commands Reference

### Building Images
```bash
# Development image
docker build -f Dockerfile.dev -t resume-app:dev .

# Production image
docker build -t resume-app:prod .
```

### Running Containers
```bash
# Development
docker run -p 3000:3000 -v $(pwd):/app resume-app:dev

# Production
docker run -p 3000:3000 resume-app:prod
```

### Managing Containers
```bash
# List running containers
docker ps

# View logs
docker logs <container_id>

# Stop container
docker stop <container_id>

# Remove container
docker rm <container_id>
```

### Managing Images
```bash
# List images
docker images

# Remove image
docker rmi <image_id>

# Remove all unused images
docker image prune -a
```

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, you can change the port mapping:
```bash
docker run -p 3001:3000 resume-app-prod
```

### Permission Issues
If you encounter permission issues on Linux/macOS:
```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Or run with different user
docker run -u $(id -u):$(id -g) -p 3000:3000 resume-app-dev
```

### Build Issues
If you encounter build issues:
```bash
# Clean build cache
docker builder prune

# Rebuild without cache
docker build --no-cache -t resume-app-prod .
```

### Memory Issues
If you encounter memory issues during build:
```bash
# Increase Docker memory limit in Docker Desktop settings
# Or use build with memory limit
docker build --memory=4g -t resume-app-prod .
```

## Security Considerations

- The production Dockerfile runs as a non-root user (`nextjs`)
- Security headers are configured in nginx
- Environment variables should be properly managed
- Regular security updates for base images

## Performance Optimization

- Multi-stage builds reduce final image size
- Alpine Linux base for smaller footprint
- Next.js standalone output for optimal performance
- Nginx reverse proxy with gzip compression

## Monitoring and Health Checks

The nginx configuration includes a health check endpoint:
```bash
curl http://localhost/health
```

You can add custom health checks to your Docker containers:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
``` 