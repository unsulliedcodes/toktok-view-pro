// routes/api.js - Enhanced with Better API Validation
import express from 'express';
import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ======================
// ENHANCED APIFY CLIENT SETUP
// ======================
const APIFY_TOKEN = process.env.APIFY_API_KEY;

// Comprehensive API key validation
let client = null;
let apiStatus = {
  configured: false,
  valid: false,
  message: 'Not configured',
  user: null
};

async function initializeApifyClient() {
  // Check if API key is set
  if (!APIFY_TOKEN || APIFY_TOKEN === 'your_actual_apify_api_key_here') {
    apiStatus.message = 'API key not configured in environment variables';
    console.error('❌ ' + apiStatus.message);
    return;
  }

  // Validate API key format
  if (!APIFY_TOKEN.startsWith('apify_api_')) {
    apiStatus.message = 'Invalid API key format. Must start with "apify_api_"';
    console.error('❌ ' + apiStatus.message);
    return;
  }

  try {
    console.log('🔄 Initializing Apify client...');
    client = new ApifyClient({ 
      token: APIFY_TOKEN,
      timeout: 30000
    });

    // Test authentication immediately
    const user = await client.user().get();
    apiStatus.configured = true;
    apiStatus.valid = true;
    apiStatus.user = user.username;
    apiStatus.message = `Authenticated as: ${user.username}`;
    
    console.log('✅ Apify client initialized successfully');
    console.log(`✅ Authenticated as: ${user.username}`);
    
  } catch (error) {
    apiStatus.configured = true;
    apiStatus.valid = false;
    
    if (error.message.includes('invalid token') || error.message.includes('unauthorized')) {
      apiStatus.message = 'Invalid API token. Please check your Apify API key.';
    } else if (error.message.includes('rate limit')) {
      apiStatus.message = 'API rate limit exceeded. Please try again later.';
    } else {
      apiStatus.message = `API connection failed: ${error.message}`;
    }
    
    console.error('❌ Apify authentication failed:', error.message);
    client = null;
  }
}

// Initialize on startup
initializeApifyClient();

const ACTOR_NAME = "clockworks/tiktok-scraper";

// ======================
// ENHANCED SCRAPER WITH BETTER ERROR HANDLING
// ======================

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

async function runScraper(input, cacheKey = null, username = null) {
  // Check API status first
  if (!apiStatus.valid) {
    throw new Error(`API configuration error: ${apiStatus.message}`);
  }

  if (!client) {
    throw new Error('Apify client not available. Please check server configuration.');
  }

  // Check cache
  if (cacheKey && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ Using cached data for: ${cacheKey}`);
      return cached.data;
    }
  }

  try {
    console.log(`🔄 Fetching from Apify for: ${cacheKey || 'unknown'}`);
    
    const run = await client.actor(ACTOR_NAME).call(input);
    console.log(`✅ Apify run started: ${run.id}`);
    
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`✅ Received ${items.length} items from Apify`);
    
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
    
    // Enhanced error categorization
    if (error.message.includes('invalid token') || 
        error.message.includes('authentication') ||
        error.message.includes('unauthorized')) {
      throw new Error('Invalid Apify API token. Please check your API key configuration in Vercel environment variables.');
    }
    
    if (error.message.includes('rate limit')) {
      throw new Error('API rate limit exceeded. Please try again in a few minutes.');
    }
    
    if (error.message.includes('not found') && username) {
      throw new Error(`User @${username} not found. Please check the username and try again.`);
    }
    
    throw new Error(`Failed to fetch data: ${error.message}`);
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

// Comprehensive health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Re-validate API key on health check
    if (!apiStatus.valid && APIFY_TOKEN && APIFY_TOKEN !== 'your_actual_apify_api_key_here') {
      await initializeApifyClient();
    }
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      apiKeyConfigured: !!APIFY_TOKEN && APIFY_TOKEN !== 'your_actual_apify_api_key_here',
      apiKeyPreview: APIFY_TOKEN ? `${APIFY_TOKEN.substring(0, 10)}...` : 'Not set',
      apiStatus: apiStatus,
      cacheSize: cache.size,
      vercel: process.env.VERCEL ? 'Yes' : 'No',
      instructions: !apiStatus.valid ? [
        '1. Visit https://console.apify.com/account/integrations',
        '2. Copy your API token (starts with apify_api_)',
        '3. Add it to Vercel Environment Variables as APIFY_API_KEY',
        '4. Redeploy your application'
      ] : null
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: error.message,
      apiStatus: apiStatus
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
      message: 'Failed to fetch trending videos',
      apiStatus: apiStatus
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
      message: `Failed to fetch videos for #${req.params.tag}`,
      apiStatus: apiStatus
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
      message: `Failed to fetch profile @${req.params.username}`,
      apiStatus: apiStatus
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
      message: `Search failed for "${req.query.q}"`,
      apiStatus: apiStatus
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

// Test API endpoint (for debugging)
router.get('/test', async (req, res) => {
  try {
    if (!apiStatus.valid) {
      return res.status(500).json({
        success: false,
        error: 'API not configured properly',
        apiStatus: apiStatus
      });
    }

    // Test with a simple TikTok request
    const input = {
      profiles: ["tiktok"],
      proxyCountryCode: "None",
      resultsPerPage: 5,
      shouldDownloadVideos: false,
    };
    
    const items = await runScraper(input, 'test');
    const videos = mapVideos(items);
    
    res.json({
      success: true,
      message: 'API test successful',
      videosCount: videos.length,
      apiStatus: apiStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      apiStatus: apiStatus
    });
  }
});

export default router;