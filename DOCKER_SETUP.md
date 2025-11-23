# Docker Setup for PostgreSQL and Redis

This project is currently configured to use SQLite for development. When you're ready to use PostgreSQL (recommended for production), follow these steps:

## Prerequisites

- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your operating system

## Setup Instructions

### 1. Start Docker Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5436
- Redis on port 6380

### 2. Update Environment Variables

Edit the `.env` file and comment out SQLite, uncomment PostgreSQL:

```env
# Database
# SQLite (current - for development)
# DATABASE_URL="file:./dev.db"

# PostgreSQL (uncomment when Docker is set up)
DATABASE_URL="postgresql://scholar:password123@localhost:5436/scholar_hub"
```

### 3. Update Prisma Schema

Edit `prisma/schema.prisma` and change the provider back to PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

**Important:** You'll also need to reverse the SQLite compatibility changes:
- Change String fields back to enum types (UserRole, VerificationStatus, PostType, ReactionType)
- Change comma-separated string fields back to arrays (researchInterests, tags)
- Change String JSON fields back to Json type (citations)
- Update the Paper-User relationship from explicit PaperAuthor junction table to implicit many-to-many

### 4. Run Migrations

```bash
npm run prisma:migrate
```

### 5. Seed the Database

```bash
npx prisma db seed
```

## Managing Docker Services

### View Logs
```bash
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Data
```bash
docker-compose down -v
```

### Restart Services
```bash
docker-compose restart
```

## Database Access

### Using Prisma Studio
```bash
npm run prisma:studio
```

### Using psql (PostgreSQL command line)
```bash
docker exec -it scholar-hub-postgres psql -U scholar -d scholar_hub
```

## Troubleshooting

### Port Already in Use

If port 5436 or 6380 is already in use, edit `docker-compose.yml` and change the port mapping:

```yaml
ports:
  - '5437:5432'  # Changed from 5436
```

Then update the DATABASE_URL in `.env` accordingly.

### Connection Refused

Make sure Docker services are running:
```bash
docker-compose ps
```

### Reset Everything

To completely reset the database:
```bash
docker-compose down -v
docker-compose up -d
npm run prisma:migrate
npx prisma db seed
```
