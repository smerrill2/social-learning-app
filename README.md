# Social Learning App

A full-stack social learning platform that aggregates and personalizes content from HackerNews, research papers, and user insights using AI-powered algorithms.

## 🚀 Features

- **Personalized Feed**: AI-driven content curation based on user preferences
- **HackerNews Integration**: Real-time sync with HackerNews stories
- **Research Papers**: Integration with arXiv for academic content
- **User Insights**: Share and discover insights from books and articles
- **Mobile-First**: React Native mobile app with beautiful UI
- **Real-time Updates**: Automatic content synchronization

## 🏗️ Architecture

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis for performance optimization
- **Authentication**: JWT-based auth with Passport
- **Scheduling**: Automated content sync with cron jobs

### Mobile App (React Native/Expo)
- **Framework**: React Native with Expo
- **Navigation**: Custom navigation with animated headers
- **State Management**: React hooks and context
- **UI Components**: Custom components with modern design

### Key Services
- **Algorithm Service**: Personalized content ranking and recommendation
- **HackerNews Service**: Automated story fetching and caching
- **ArXiv Service**: Research paper integration
- **Cache Service**: Redis-based caching layer

## 🛠️ Tech Stack

**Backend:**
- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- Redis
- Passport.js
- JWT
- Axios

**Mobile:**
- React Native
- Expo
- TypeScript
- React Navigation
- Axios

**External APIs:**
- HackerNews API
- arXiv API

## 📦 Project Structure

```
social-learning-app/
├── social-learning-app/
│   ├── backend/                 # NestJS backend
│   │   ├── src/
│   │   │   ├── algorithm/      # AI recommendation engine
│   │   │   ├── auth/           # Authentication
│   │   │   ├── hackernews/     # HackerNews integration
│   │   │   ├── arxiv/          # Research paper integration
│   │   │   ├── insights/       # User insights
│   │   │   ├── entities/       # Database entities
│   │   │   └── cache/          # Caching service
│   │   └── dist/               # Compiled JavaScript
│   └── mobile/                 # React Native app
│       ├── src/
│       │   ├── components/     # UI components
│       │   ├── screens/        # App screens
│       │   ├── services/       # API services
│       │   └── types/          # TypeScript types
│       └── assets/             # Images and assets
├── package.json                # Root package.json
└── start-dev.sh               # Development startup script
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL
- Redis
- Expo CLI (`npm install -g @expo/cli`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/smerrill2/social-learning-app.git
   cd social-learning-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd social-learning-app/backend && npm install
   cd ../mobile && npm install
   ```

3. **Set up the database**
   - Create a PostgreSQL database
   - Update database configuration in `backend/.env`

4. **Set up Redis**
   - Install and start Redis server
   - Update Redis configuration if needed

5. **Environment Configuration**
   Create `.env` files in the backend directory:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_NAME=social_learning
   JWT_SECRET=your_jwt_secret
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Running the Application

#### Development Mode (Recommended)
```bash
# From the root directory
npm run dev
```
This will start both the backend and mobile app concurrently.

#### Manual Start
```bash
# Terminal 1: Start backend
cd social-learning-app/backend
npm run start:dev

# Terminal 2: Start mobile app
cd social-learning-app/mobile
npm start
```

### API Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

#### HackerNews
- `GET /hackernews/stories` - Get top stories
- `GET /hackernews/sync` - Trigger manual sync

#### Algorithm
- `GET /algorithm/feed` - Get personalized feed
- `GET /algorithm/preferences` - Get user preferences
- `PUT /algorithm/preferences` - Update preferences

## 🎯 Current Status

### ✅ Completed Features
- Full-stack architecture setup
- User authentication system
- HackerNews integration with real-time sync
- Personalized algorithm engine
- Mobile app with modern UI
- Caching and performance optimization
- Algorithm preference management

### 🚧 Recent Updates
- Disabled algorithm temporarily for direct HackerNews display
- Fixed network connectivity issues
- Optimized refresh functionality
- Added pull-to-refresh with immediate sync

## 🔧 Configuration

### Mobile App API Configuration
Update the IP address in `mobile/src/services/api.ts` to match your development machine:
```typescript
const API_BASE_URL = 'http://YOUR_IP_ADDRESS:3000';
```

### Database Setup
The app uses PostgreSQL with the following entities:
- Users
- Books
- Insights
- HackerNews Stories
- Research Papers
- Interactions

## 📱 Mobile App Features

- **Animated Header**: Hides/shows on scroll
- **Pull-to-Refresh**: Syncs latest HackerNews content
- **Modern UI**: Clean, card-based design
- **Real-time Updates**: Immediate content refresh
- **Responsive Design**: Optimized for mobile devices

## 🧠 Algorithm Features

The recommendation engine considers:
- Content type preferences (HackerNews, Research Papers, Insights)
- Research category interests
- Feed behavior settings (recency, popularity, diversity)
- User interaction history
- Social signals and engagement

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- HackerNews API for content aggregation
- arXiv for research paper access
- NestJS and React Native communities
- Open source contributors

## 📞 Support

For questions or support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ using NestJS and React Native**
