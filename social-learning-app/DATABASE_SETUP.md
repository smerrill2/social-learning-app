# Quick Database Setup Tutorial

## PostgreSQL Setup (You have this installed ✅)

### 1. Create the Database
```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE social_learning;
CREATE USER social_learning_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE social_learning TO social_learning_user;

# Exit psql
\q
```

### 2. Update Backend .env File
```bash
cd /Users/spencermerrill/social-learning-app/social-learning-app/backend

# Copy the example file
cp .env.example .env

# Edit the .env file with your credentials
```

**Edit the .env file with these values:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=social_learning_user
DB_PASSWORD=your_secure_password
DB_NAME=social_learning

# JWT Configuration (change this!)
JWT_SECRET=super-secret-jwt-key-change-this-now-$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Configuration
NODE_ENV=development
PORT=3000
```

## Redis Setup (Quick Install)

### Option 1: Using Homebrew (Recommended - 2 minutes)
```bash
# Install Redis
brew install redis

# Start Redis (will run in background)
brew services start redis

# Test Redis is working
redis-cli ping
# Should return: PONG
```

### Option 2: Using Docker (Alternative)
```bash
# Run Redis in Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Test Redis is working
docker exec redis redis-cli ping
# Should return: PONG
```

### Option 3: Redis Cloud (No local install)
1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Create free account (30MB free tier)
3. Create database
4. Copy connection details to .env:
```env
REDIS_HOST=your-redis-cloud-host.com
REDIS_PORT=12345
REDIS_PASSWORD=your-redis-password  # Add this line if using cloud
```

## Test Everything Works

### 1. Start the Backend
```bash
cd /Users/spencermerrill/social-learning-app/social-learning-app/backend
npm run start:dev
```

**You should see:**
```
[Nest] Application successfully started
[TypeORM] Database connected
[Redis] Cache connected
```

### 2. Test Database Connection
```bash
# In another terminal, test the API
curl http://localhost:3000/auth/profile
# Should return: {"statusCode":401,"message":"Unauthorized"}
# This means the API is working! (401 is expected without auth token)
```

## Troubleshooting

### PostgreSQL Issues
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if stopped
brew services start postgresql

# Reset password if needed
psql postgres -c "ALTER USER social_learning_user PASSWORD 'new_password';"
```

### Redis Issues
```bash
# Check if Redis is running
brew services list | grep redis

# Start Redis if stopped
brew services start redis

# Check Redis logs
brew services info redis
```

### Common .env Mistakes
- ❌ `DB_PASSWORD=my password` (spaces break it)
- ✅ `DB_PASSWORD="my password"` or `DB_PASSWORD=mypassword`
- ❌ Missing quotes around special characters
- ✅ Use simple passwords for development: `DB_PASSWORD=password123`

## Quick Commands Summary
```bash
# 1. Create database
psql postgres -c "CREATE DATABASE social_learning;"

# 2. Install & start Redis
brew install redis && brew services start redis

# 3. Copy and edit .env file
cd backend && cp .env.example .env && nano .env

# 4. Start the backend
npm run start:dev

# 5. In another terminal, start mobile app
cd ../mobile && npm start
```

## Next Steps After Setup
1. Register a test user in the mobile app
2. Try creating an insight
3. Test the feed functionality

**Need help?** The backend will show detailed error messages in the terminal if something's wrong with the database connection.