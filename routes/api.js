// routes/api.js - Enhanced with Better Error Handling
import express from 'express';
import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ======================
// APIFY CLIENT SETUP WITH VALIDATION
// ======================
const APIFY_TOKEN = process.env.APIFY_API_KEY;

// Validate API key on startup
if (!APIFY_TOKEN || APIFY_TOKEN === 'your_actual_apify_api_key_here') {
  console.error('❌ APIFY_API_KEY is not set in environment variables');
  console.log('💡 Please add your Apify API key to Vercel environment variables');
}

let client;
try {
  client = new ApifyClient({ 
    token: APIFY_TOKEN,
    timeout: 30000 // 30 second timeout
  });
  console.log('✅ Apify client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Apify client:', error.message);
}

const ACTOR_NAME = "clockworks/tiktok-scraper";

// ======================
// ENHANCED HELPER FUNCTIONS
// ======================

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Enhanced scraper with comprehensive error handling
async function runScraper(input, cacheKey = null, username = null) {
  // Validate API key first
  if (!APIFY_TOKEN || APIFY_TOKEN === 'your_actual_apify_api_key_here') {
    throw new Error('Apify API key not configured. Please set APIFY_API_KEY environment variable in Vercel.');
  }

  if (!client) {
    throw new Error('Apify client not initialized. Check your API key.');
  }

  // Check cache first
  if (cacheKey && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ Using cached data for: ${cacheKey}`);
      return cached.data;
    }
  }

  try {
    console.log(`🔄 Fetching data from Apify for: ${cacheKey || 'unknown'}`);
    
    // Test API connection first
    try {
      const me = await client.user().get();
      console.log(`✅ Apify API connected as: ${me.username}`);
    } catch (authError) {
      console.error('❌ Apify authentication failed:', authError.message);
      throw new Error('Invalid Apify API token. Please check your API key in Vercel environment variables.');
    }

    // Run the TikTok scraper
    const run = await client.actor(ACTOR_NAME).call(input);
    console.log(`✅ Apify run started: ${run.id}`);
    
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`✅ Received ${items.length} items from Apify`);
    
    // Validate response
    if (!items || items.length === 0) {
      if (username) {
        throw new Error(`User @${username} not found, account is private, or has no public videos.`);
      } else {
        throw new Error('No content found for this search. Try a different query.');
      }
    }

    // Cache successful results
    if (cacheKey) {
      cache.set(cacheKey, {
        data: items,
        timestamp: Date.now()
      });
    }
    
    return items;

  } catch (error) {
    console.error('❌ Apify scraper error:', error.message);
    
    // Handle specific error cases
    if (error.message.includes('invalid token') || 
        error.message.includes('authentication') ||
        error.message.includes('unauthorized')) {
      throw new Error('Invalid Apify API token. Please check your API key in Vercel environment variables.');
    }
    
    if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
      throw new Error('API rate limit exceeded. Please try again in a few minutes.');
    }
    
    if (error.message.includes('not found') && username) {
      throw new Error(`User @${username} not found. Please check the username and try again.`);
    }
    
    if (error.message.includes('private')) {
      throw new Error(`User @${username} account is private and cannot be accessed.`);
    }
    
    // Generic error with more context
    throw new Error(`Failed to fetch TikTok data: ${error.message}`);
  }
}

// Map video data to consistent format
function mapVideos(items) {
  if (!items || !Array.isArray(items)) return [];
  
  return items
    .filter(item => item && item.id)
    .map((item) => ({
      id: item.id,
      creator: {
        username: item.authorMeta?.name || item.authorMeta?.nickName || 'unknown',
        avatar: item.authorMeta?.avatar || 'https://via.placeholder.com/150/1a1a1a/ffffff?text=TK',
      },
      description: item.text || 'No description available',
      soundtrack: item.musicMeta?.musicName || 
                 (item.musicMeta?.musicOriginal ? "Original Sound" : "No sound information"),
      likes: item.diggCount || 0,
      comments: item.commentCount || 0,
      shares: item.shareCount || 0,
      plays: item.playCount || 0,
      hashtags: item.hashtags?.map((h) => h.name).filter(Boolean) || [],
      videoUrl: item.webVideoUrl || `https://www.tiktok.com/@${item.authorMeta?.name}/video/${item.id}`,
      createdAt: item.createTime || Date.now(),
    }))
    .filter(video => video.id);
}

// Map profile data
function mapProfile(authorMeta) {
  if (!authorMeta) return null;
  
  return {
    username: authorMeta.name || authorMeta.nickName,
    bio: authorMeta.signature || "No bio available",
    followers: authorMeta.followers || authorMeta.followerCount || 0,
    following: authorMeta.following || authorMeta.followingCount || 0,
    likes: authorMeta.heart || authorMeta.diggCount || 0,
    avatar: authorMeta.avatar || 'https://via.placeholder.com/150/1a1a1a/ffffff?text=TK',
    verified: authorMeta.verified || false,
    private: authorMeta.privateAccount || false,
  };
}

// ======================
// ENHANCED API ROUTES
// ======================

// Health check endpoint with API validation
router.get('/health', async (req, res) => {
  try {
    let apiStatus = 'Not configured';
    
    if (APIFY_TOKEN && APIFY_TOKEN !== 'your_actual_apify_api_key_here') {
      try {
        const me = await client.user().get();
        apiStatus = `Connected as: ${me.username}`;
      } catch (error) {
        apiStatus = `Error: ${error.message}`;
      }
    }
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      apiKeyConfigured: !!APIFY_TOKEN && APIFY_TOKEN !== 'your_actual_apify_api_key_here',
      apiStatus: apiStatus,
      cacheSize: cache.size,
      vercel: process.env.VERCEL ? 'Yes' : 'No'
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: error.message
    });
  }
});

// Get trending videos
router.get('/trending', async (req, res) => {
  try {
    const input = {
      hashtags: ["foryou", "viral", "trending"],
      proxyCountryCode: "None",
      resultsPerPage: 15,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    };
    
    const items = await runScraper(input, 'trending');
    const videos = mapVideos(items);
    
    res.json({
      success: true,
      data: videos,
      count: videos.length
    });
  } catch (error) {
    console.error('Trending API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch trending videos'
    });
  }
});

// Get videos by hashtag
router.get('/hashtag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag;
    
    if (!tag || tag.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Hashtag must be at least 2 characters'
      });
    }

    const input = {
      hashtags: [tag],
      proxyCountryCode: "None",
      resultsPerPage: 15,
      shouldDownloadVideos: false,
    };
    
    const items = await runScraper(input, `hashtag_${tag}`);
    const videos = mapVideos(items);
    
    res.json({
      success: true,
      data: videos,
      hashtag: tag,
      count: videos.length
    });
  } catch (error) {
    console.error('Hashtag API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: `Failed to fetch videos for #${req.params.tag}`
    });
  }
});

// Get profile and videos
router.get('/profile/:username', async (req, res) => {
  try {
    const username = req.params.username;
    
    if (!username || username.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 2 characters'
      });
    }

    const input = {
      profiles: [username],
      proxyCountryCode: "None",
      resultsPerPage: 20,
      shouldDownloadVideos: false,
    };
    
    const items = await runScraper(input, `profile_${username}`, username);
    
    if (!items || items.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Profile @${username} not found or has no public videos`
      });
    }

    const profile = mapProfile(items[0].authorMeta);
    const videos = mapVideos(items);
    
    res.json({
      success: true,
      profile: profile,
      videos: videos,
      videoCount: videos.length
    });
  } catch (error) {
    console.error('Profile API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: `Failed to fetch profile @${req.params.username}`
    });
  }
});

// Search videos
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    let input;
    let cacheKey;
    let username = null;

    if (query.startsWith("#")) {
      const tag = query.slice(1);
      input = { 
        hashtags: [tag], 
        resultsPerPage: 15,
        shouldDownloadVideos: false 
      };
      cacheKey = `search_hashtag_${tag}`;
    } else if (query.startsWith("@")) {
      username = query.slice(1);
      input = { 
        profiles: [username], 
        resultsPerPage: 15,
        shouldDownloadVideos: false 
      };
      cacheKey = `search_profile_${username}`;
    } else {
      // Search by keyword (using hashtag search as fallback)
      input = { 
        hashtags: [query], 
        resultsPerPage: 15,
        shouldDownloadVideos: false 
      };
      cacheKey = `search_keyword_${query}`;
    }

    input.proxyCountryCode = "None";
    
    const items = await runScraper(input, cacheKey, username);
    const videos = mapVideos(items);
    
    res.json({
      success: true,
      data: videos,
      query: query,
      count: videos.length
    });
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: `Search failed for "${req.query.q}"`
    });
  }
});

// Clear cache endpoint
router.delete('/cache', (req, res) => {
  const previousSize = cache.size;
  cache.clear();
  res.json({
    success: true,
    message: `Cache cleared (${previousSize} items removed)`
  });
});

export default router;