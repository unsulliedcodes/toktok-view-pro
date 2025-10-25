// app.js - Updated for Vercel
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ES6 module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// MIDDLEWARE SETUP
// ======================
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-vercel-app.vercel.app', 'https://toktok-view-pro.vercel.app']
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ======================
// VIEW ENGINE SETUP
// ======================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ======================
// ROUTES
// ======================

// Home page route
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'TokView Pro - Streamline Your TikTok Viewing',
    currentPage: 'home'
  });
});

// Trending page route
app.get('/trending', async (req, res) => {
  try {
    res.render('trending', { 
      title: 'Trending Videos - TokView Pro',
      currentPage: 'trending',
      videos: []
    });
  } catch (error) {
    console.error('Trending page error:', error);
    res.render('error', { 
      title: 'Error - TokView Pro',
      message: 'Failed to load trending videos'
    });
  }
});

// Hashtag page route
app.get('/hashtag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag;
    res.render('hashtag', { 
      title: `#${tag} - TokView Pro`,
      currentPage: 'hashtag',
      hashtag: tag,
      videos: []
    });
  } catch (error) {
    console.error('Hashtag page error:', error);
    res.render('error', { 
      title: 'Error - TokView Pro',
      message: `Failed to load videos for #${req.params.tag}`
    });
  }
});

// Profile page route
app.get('/profile/:username', async (req, res) => {
  try {
    const username = req.params.username;
    res.render('profile', { 
      title: `@${username} - TokView Pro`,
      currentPage: 'profile',
      username: username,
      profile: null,
      videos: []
    });
  } catch (error) {
    console.error('Profile page error:', error);
    res.render('error', { 
      title: 'Error - TokView Pro',
      message: `Failed to load profile @${req.params.username}`
    });
  }
});

// Search results page
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    res.render('search', { 
      title: `Search "${query}" - TokView Pro`,
      currentPage: 'search',
      query: query,
      videos: []
    });
  } catch (error) {
    console.error('Search page error:', error);
    res.render('error', { 
      title: 'Error - TokView Pro',
      message: 'Search failed'
    });
  }
});

// API routes
app.use('/api', apiRoutes);

// ======================
// ERROR HANDLING
// ======================

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    title: 'Page Not Found - TokView Pro',
    message: 'The page you are looking for does not exist.'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).render('error', { 
    title: 'Server Error - TokView Pro',
    message: 'Something went wrong on our end. Please try again later.'
  });
});

// ======================
// VERCEL COMPATIBILITY
// ======================

// Export for Vercel serverless functions
export default app;

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log('TokView Pro Server Started!');
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`API Key: ${process.env.APIFY_API_KEY ? 'Set' : 'Missing'}`);
    
    if (!process.env.APIFY_API_KEY) {
      console.log('\n WARNING: Please set your APIFY_API_KEY in the environment variables');
      console.log('Get your key from: https://console.apify.com/account/integrations');
    }
  });
}