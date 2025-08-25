const { DataSource } = require('typeorm');

// Create a database connection for seeding
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'social_learning',
  entities: ['src/entities/*.entity.ts'],
  synchronize: false,
});

const seedData = async () => {
  try {
    console.log('🌱 Initializing database connection...');
    await AppDataSource.initialize();
    
    console.log('📚 Creating test books...');
    
    // Create books directly in database
    const bookRepository = AppDataSource.getRepository('Book');
    
    const booksData = [
      {
        title: "Atomic Habits",
        author: "James Clear",
        description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
        coverImageUrl: "https://m.media-amazon.com/images/I/81wgcld4wxL.jpg",
        genre: ["Self-Help", "Productivity"],
        categories: ["Personal Development"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "The Psychology of Money",
        author: "Morgan Housel", 
        description: "Timeless lessons on wealth, greed, and happiness",
        coverImageUrl: "https://m.media-amazon.com/images/I/71g2ednj0JL.jpg",
        genre: ["Finance", "Psychology"],
        categories: ["Business", "Personal Finance"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Deep Work",
        author: "Cal Newport",
        description: "Rules for Focused Success in a Distracted World", 
        coverImageUrl: "https://m.media-amazon.com/images/I/71YvdV5ZBdL.jpg",
        genre: ["Productivity", "Self-Help"],
        categories: ["Career", "Focus"],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const savedBooks = [];
    for (const bookData of booksData) {
      const result = await bookRepository.save(bookData);
      savedBooks.push(result);
      console.log(`✅ Book created: ${result.title}`);
    }

    console.log('💡 Creating test insights...');
    
    // Get user ID for smerrill
    const userRepository = AppDataSource.getRepository('User');
    const user = await userRepository.findOne({ where: { username: 'smerrill' } });
    
    if (!user) {
      console.error('❌ User smerrill not found!');
      return;
    }

    const insightRepository = AppDataSource.getRepository('Insight');
    
    const insightsData = [
      // Atomic Habits insights
      {
        content: "The key to building habits is making them so small that you can't say no. Start with just 2 minutes a day.",
        tags: ["habits", "motivation", "productivity"],
        pageReference: "p. 127",
        bookId: savedBooks[0].id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        content: "You don't rise to the level of your goals. You fall to the level of your systems. Focus on systems, not goals.",
        tags: ["systems", "goals", "mindset"],
        pageReference: "p. 27",
        bookId: savedBooks[0].id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        content: "Environment is the invisible hand that shapes human behavior. Design your environment for success.",
        tags: ["environment", "design", "behavior"],
        pageReference: "p. 82",
        bookId: savedBooks[0].id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Psychology of Money insights
      {
        content: "Getting money requires taking risks, being optimistic, and putting yourself out there. But keeping money requires the opposite: humility, fear, and frugality.",
        tags: ["money", "psychology", "wealth"],
        pageReference: "p. 45",
        bookId: savedBooks[1].id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        content: "Spending money to show people how much money you have is the fastest way to have less money.",
        tags: ["spending", "wealth", "psychology"],
        pageReference: "p. 78",
        bookId: savedBooks[1].id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        content: "The highest form of wealth is the ability to wake up every morning and say, 'I can do whatever I want today.'",
        tags: ["freedom", "wealth", "independence"],
        pageReference: "p. 156",
        bookId: savedBooks[1].id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Deep Work insights
      {
        content: "Human beings, it seems, are at their best when immersed deeply in something challenging.",
        tags: ["focus", "challenge", "productivity"],
        pageReference: "p. 84",
        bookId: savedBooks[2].id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        content: "The ability to perform deep work is becoming increasingly rare—and increasingly valuable.",
        tags: ["deep work", "value", "rare skills"],
        pageReference: "p. 14",
        bookId: savedBooks[2].id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        content: "Clarity about what matters provides clarity about what does not.",
        tags: ["clarity", "focus", "priorities"],
        pageReference: "p. 263",
        bookId: savedBooks[2].id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const insightData of insightsData) {
      const result = await insightRepository.save(insightData);
      console.log(`✅ Created insight: "${result.content.substring(0, 50)}..."`);
    }

    console.log('\n🎉 Test data seeded successfully!');
    console.log('📱 You can now refresh http://localhost:3001 and see your feed populated!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await AppDataSource.destroy();
  }
};

seedData();