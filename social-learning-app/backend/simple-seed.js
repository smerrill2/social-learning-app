require('dotenv').config();
const { Client } = require('pg');

const seedData = async () => {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'social_learning',
  });

  try {
    console.log('🌱 Connecting to database...');
    await client.connect();

    // Get user ID for smerrill
    console.log('👤 Finding user smerrill...');
    const userResult = await client.query("SELECT id FROM users WHERE username = 'smerrill'");
    
    if (userResult.rows.length === 0) {
      console.error('❌ User smerrill not found!');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Found user smerrill with ID: ${userId}\n`);

    console.log('📚 Creating test books...');
    
    const booksData = [
      {
        title: "Atomic Habits",
        author: "James Clear",
        description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
        coverImageUrl: "https://m.media-amazon.com/images/I/81wgcld4wxL.jpg",
        metadata: {
          genre: ["Self-Help", "Productivity"],
          categories: ["Personal Development"],
          publishedYear: 2018,
          pageCount: 320
        }
      },
      {
        title: "The Psychology of Money",
        author: "Morgan Housel", 
        description: "Timeless lessons on wealth, greed, and happiness",
        coverImageUrl: "https://m.media-amazon.com/images/I/71g2ednj0JL.jpg",
        metadata: {
          genre: ["Finance", "Psychology"],
          categories: ["Business", "Personal Finance"],
          publishedYear: 2020,
          pageCount: 256
        }
      },
      {
        title: "Deep Work",
        author: "Cal Newport",
        description: "Rules for Focused Success in a Distracted World", 
        coverImageUrl: "https://m.media-amazon.com/images/I/71YvdV5ZBdL.jpg",
        metadata: {
          genre: ["Productivity", "Self-Help"],
          categories: ["Career", "Focus"],
          publishedYear: 2016,
          pageCount: 304
        }
      }
    ];

    const bookIds = [];
    for (const book of booksData) {
      const result = await client.query(
        'INSERT INTO books (title, author, description, "coverImageUrl", metadata, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id',
        [book.title, book.author, book.description, book.coverImageUrl, JSON.stringify(book.metadata)]
      );
      bookIds.push(result.rows[0].id);
      console.log(`✅ Book created: ${book.title}`);
    }

    console.log('\n💡 Creating test insights...');
    
    const insightsData = [
      // Atomic Habits insights
      {
        content: "The key to building habits is making them so small that you can't say no. Start with just 2 minutes a day.",
        tags: '["habits", "motivation", "productivity"]',
        pageReference: "p. 127",
        bookId: bookIds[0]
      },
      {
        content: "You don't rise to the level of your goals. You fall to the level of your systems. Focus on systems, not goals.",
        tags: '["systems", "goals", "mindset"]',
        pageReference: "p. 27",
        bookId: bookIds[0]
      },
      {
        content: "Environment is the invisible hand that shapes human behavior. Design your environment for success.",
        tags: '["environment", "design", "behavior"]',
        pageReference: "p. 82",
        bookId: bookIds[0]
      },
      // Psychology of Money insights
      {
        content: "Getting money requires taking risks, being optimistic, and putting yourself out there. But keeping money requires the opposite: humility, fear, and frugality.",
        tags: '["money", "psychology", "wealth"]',
        pageReference: "p. 45",
        bookId: bookIds[1]
      },
      {
        content: "Spending money to show people how much money you have is the fastest way to have less money.",
        tags: '["spending", "wealth", "psychology"]',
        pageReference: "p. 78",
        bookId: bookIds[1]
      },
      {
        content: "The highest form of wealth is the ability to wake up every morning and say, 'I can do whatever I want today.'",
        tags: '["freedom", "wealth", "independence"]',
        pageReference: "p. 156",
        bookId: bookIds[1]
      },
      // Deep Work insights
      {
        content: "Human beings, it seems, are at their best when immersed deeply in something challenging.",
        tags: '["focus", "challenge", "productivity"]',
        pageReference: "p. 84",
        bookId: bookIds[2]
      },
      {
        content: "The ability to perform deep work is becoming increasingly rare—and increasingly valuable.",
        tags: '["deep work", "value", "rare skills"]',
        pageReference: "p. 14",
        bookId: bookIds[2]
      },
      {
        content: "Clarity about what matters provides clarity about what does not.",
        tags: '["clarity", "focus", "priorities"]',
        pageReference: "p. 263",
        bookId: bookIds[2]
      }
    ];

    for (const insight of insightsData) {
      await client.query(
        'INSERT INTO insights (content, tags, "pageReference", "bookId", "authorId", engagement, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
        [insight.content, insight.tags, insight.pageReference, insight.bookId, userId, '{"likeCount":0,"shareCount":0,"saveCount":0,"applyCount":0,"viewCount":0,"engagementRate":0}']
      );
      console.log(`✅ Created insight: "${insight.content.substring(0, 50)}..."`);
    }

    console.log('\n🎉 Test data seeded successfully!');
    console.log('📱 You can now refresh http://localhost:3001 and see your feed populated!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await client.end();
  }
};

seedData();