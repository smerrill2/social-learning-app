const axios = require('axios');

const API_BASE = 'http://localhost:3000';

const testData = async () => {
  try {
    console.log('🧪 Adding test data to your app...\n');

    // 1. Login as your existing user (smerrill)
    console.log('🔐 Logging in as smerrill...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: "spencer19merrill@gmail.com",
      password: "TestPassword123"
    });
    const { token } = loginResponse.data;
    console.log(`✅ Logged in successfully\n`);

    // 2. Create test books
    console.log('📚 Creating test books...');
    const books = [];
    
    const bookData = [
      {
        title: "Atomic Habits",
        author: "James Clear",
        description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
        coverImageUrl: "https://m.media-amazon.com/images/I/81wgcld4wxL.jpg",
        genre: ["Self-Help", "Productivity"],
        categories: ["Personal Development"]
      },
      {
        title: "The Psychology of Money",
        author: "Morgan Housel",
        description: "Timeless lessons on wealth, greed, and happiness",
        coverImageUrl: "https://m.media-amazon.com/images/I/71g2ednj0JL.jpg",
        genre: ["Finance", "Psychology"],
        categories: ["Business", "Personal Finance"]
      },
      {
        title: "Deep Work",
        author: "Cal Newport",
        description: "Rules for Focused Success in a Distracted World",
        coverImageUrl: "https://m.media-amazon.com/images/I/71YvdV5ZBdL.jpg",
        genre: ["Productivity", "Self-Help"],
        categories: ["Career", "Focus"]
      }
    ];

    for (const bookInfo of bookData) {
      const bookResponse = await axios.post(`${API_BASE}/books`, bookInfo, {
        headers: { Authorization: `Bearer ${token}` }
      });
      books.push(bookResponse.data);
      console.log(`✅ Book created: ${bookResponse.data.title}`);
    }
    console.log('');

    // 3. Create diverse test insights across all books
    console.log('💡 Creating test insights...');
    
    const insightData = [
      // Atomic Habits insights
      {
        content: "The key to building habits is making them so small that you can't say no. Start with just 2 minutes a day.",
        tags: ["habits", "motivation", "productivity"],
        pageReference: "p. 127",
        bookId: books[0].id
      },
      {
        content: "You don't rise to the level of your goals. You fall to the level of your systems. Focus on systems, not goals.",
        tags: ["systems", "goals", "mindset"],
        pageReference: "p. 27",
        bookId: books[0].id
      },
      {
        content: "Environment is the invisible hand that shapes human behavior. Design your environment for success.",
        tags: ["environment", "design", "behavior"],
        pageReference: "p. 82",
        bookId: books[0].id
      },
      // Psychology of Money insights
      {
        content: "Getting money requires taking risks, being optimistic, and putting yourself out there. But keeping money requires the opposite: humility, fear, and frugality.",
        tags: ["money", "psychology", "wealth"],
        pageReference: "p. 45",
        bookId: books[1].id
      },
      {
        content: "Spending money to show people how much money you have is the fastest way to have less money.",
        tags: ["spending", "wealth", "psychology"],
        pageReference: "p. 78",
        bookId: books[1].id
      },
      {
        content: "The highest form of wealth is the ability to wake up every morning and say, 'I can do whatever I want today.'",
        tags: ["freedom", "wealth", "independence"],
        pageReference: "p. 156",
        bookId: books[1].id
      },
      // Deep Work insights
      {
        content: "Human beings, it seems, are at their best when immersed deeply in something challenging.",
        tags: ["focus", "challenge", "productivity"],
        pageReference: "p. 84",
        bookId: books[2].id
      },
      {
        content: "The ability to perform deep work is becoming increasingly rare—and increasingly valuable.",
        tags: ["deep work", "value", "rare skills"],
        pageReference: "p. 14",
        bookId: books[2].id
      },
      {
        content: "Clarity about what matters provides clarity about what does not.",
        tags: ["clarity", "focus", "priorities"],
        pageReference: "p. 263",
        bookId: books[2].id
      }
    ];

    for (const insight of insightData) {
      await axios.post(`${API_BASE}/insights`, insight, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Created insight: "${insight.content.substring(0, 50)}..."`);
    }

    console.log('\n🎉 Test data added successfully!');
    console.log('📱 You can now refresh http://localhost:3001 and see your feed populated!');
    console.log('✨ Your feed should now show all the test insights!');

  } catch (error) {
    console.error('❌ Error adding test data:', error.response?.data || error.message);
  }
};

// Run the test
testData();