// routes/api.js - Enhanced for Vercel
import express from "express";
import { ApifyClient } from "apify-client";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ======================
// APIFY CLIENT SETUP
// ======================
const APIFY_TOKEN = process.env.APIFY_API_KEY;

// Enhanced error handling for missing API key
if (!APIFY_TOKEN || APIFY_TOKEN === "your_actual_apify_api_key_here") {
  console.error("❌ APIFY_API_KEY is not set in environment variables");
  console.log(
    "💡 Please add your Apify API key to Vercel environment variables"
  );
}

let client;
try {
  client = new ApifyClient({
    token: APIFY_TOKEN,
  });
} catch (error) {
  console.error("❌ Failed to initialize Apify client:", error.message);
}

const ACTOR_NAME = "clockworks/tiktok-scraper";

// ======================
// HELPER FUNCTIONS
// ======================

// Simple in-memory cache for serverless environment
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper to run the Apify scraper with better error handling
async function runScraper(input, cacheKey = null) {
  // Check if API key is configured
  if (!APIFY_TOKEN || APIFY_TOKEN === "your_actual_apify_api_key_here") {
    throw new Error(
      "Apify API key not configured. Please set APIFY_API_KEY environment variable."
    );
  }

  if (!client) {
    throw new Error("Apify client not initialized");
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
    console.log(`🔄 Fetching fresh data for: ${cacheKey || "unknown"}`);

    const run = await client.actor(ACTOR_NAME).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Cache the results
    if (cacheKey) {
      cache.set(cacheKey, {
        data: items,
        timestamp: Date.now(),
      });
    }

    return items;
  } catch (error) {
    console.error("❌ Apify scraper error:", error.message);

    if (
      error.message.includes("invalid token") ||
      error.message.includes("unauthorized")
    ) {
      throw new Error(
        "Invalid Apify API key. Please check your environment variables."
      );
    }

    if (error.message.includes("rate limit")) {
      throw new Error("API rate limit exceeded. Please try again later.");
    }

    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

// Map video data to consistent format
function mapVideos(items) {
  if (!items || !Array.isArray(items)) return [];

  return items
    .filter((item) => item && item.id)
    .map((item) => ({
      id: item.id,
      creator: {
        username:
          item.authorMeta?.name || item.authorMeta?.nickName || "unknown",
        avatar:
          item.authorMeta?.avatar ||
          "https://via.placeholder.com/150/1a1a1a/ffffff?text=TK",
      },
      description: item.text || "No description available",
      soundtrack:
        item.musicMeta?.musicName ||
        (item.musicMeta?.musicOriginal
          ? "Original Sound"
          : "No sound information"),
      likes: item.diggCount || 0,
      comments: item.commentCount || 0,
      shares: item.shareCount || 0,
      plays: item.playCount || 0,
      hashtags: item.hashtags?.map((h) => h.name).filter(Boolean) || [],
      videoUrl:
        item.webVideoUrl ||
        `https://www.tiktok.com/@${item.authorMeta?.name}/video/${item.id}`,
      createdAt: item.createTime || Date.now(),
    }))
    .filter((video) => video.id); // Remove any invalid entries
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
    avatar:
      authorMeta.avatar ||
      "https://via.placeholder.com/150/1a1a1a/ffffff?text=TK",
    verified: authorMeta.verified || false,
    private: authorMeta.privateAccount || false,
  };
}

// ======================
// API ROUTES
// ======================

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    apiKeyConfigured:
      !!APIFY_TOKEN && APIFY_TOKEN !== "your_actual_apify_api_key_here",
    cacheSize: cache.size,
    vercel: process.env.VERCEL ? "Yes" : "No",
  });
});

// Get trending videos
router.get("/trending", async (req, res) => {
  try {
    const input = {
      hashtags: ["foryou", "viral", "trending"],
      proxyCountryCode: "None",
      resultsPerPage: 15,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    };

    const items = await runScraper(input, "trending");
    const videos = mapVideos(items);

    res.json({
      success: true,
      data: videos,
      count: videos.length,
    });
  } catch (error) {
    console.error("Trending API error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to fetch trending videos",
    });
  }
});

// Get videos by hashtag
router.get("/hashtag/:tag", async (req, res) => {
  try {
    const tag = req.params.tag;

    if (!tag || tag.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Hashtag must be at least 2 characters",
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
      count: videos.length,
    });
  } catch (error) {
    console.error("Hashtag API error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: `Failed to fetch videos for #${req.params.tag}`,
    });
  }
});

// Get profile and videos
router.get("/profile/:username", async (req, res) => {
  try {
    const username = req.params.username;

    if (!username || username.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Username must be at least 2 characters",
      });
    }

    const input = {
      profiles: [username],
      proxyCountryCode: "None",
      resultsPerPage: 20,
      shouldDownloadVideos: false,
    };

    const items = await runScraper(input, `profile_${username}`);

    if (!items || items.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Profile @${username} not found or has no public videos`,
      });
    }

    const profile = mapProfile(items[0].authorMeta);
    const videos = mapVideos(items);

    res.json({
      success: true,
      profile: profile,
      videos: videos,
      videoCount: videos.length,
    });
  } catch (error) {
    console.error("Profile API error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: `Failed to fetch profile @${req.params.username}`,
    });
  }
});

// Search videos
router.get("/search", async (req, res) => {
  try {
    const query = (req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query is required",
      });
    }

    let input;
    let cacheKey;

    if (query.startsWith("#")) {
      const tag = query.slice(1);
      input = {
        hashtags: [tag],
        resultsPerPage: 15,
        shouldDownloadVideos: false,
      };
      cacheKey = `search_hashtag_${tag}`;
    } else if (query.startsWith("@")) {
      const username = query.slice(1);
      input = {
        profiles: [username],
        resultsPerPage: 15,
        shouldDownloadVideos: false,
      };
      cacheKey = `search_profile_${username}`;
    } else {
      // Search by keyword (using hashtag search as fallback)
      input = {
        hashtags: [query],
        resultsPerPage: 15,
        shouldDownloadVideos: false,
      };
      cacheKey = `search_keyword_${query}`;
    }

    input.proxyCountryCode = "None";

    const items = await runScraper(input, cacheKey);
    const videos = mapVideos(items);

    res.json({
      success: true,
      data: videos,
      query: query,
      count: videos.length,
    });
  } catch (error) {
    console.error("Search API error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: `Search failed for "${req.query.q}"`,
    });
  }
});

// Clear cache endpoint (for development)
router.delete("/cache", (req, res) => {
  const previousSize = cache.size;
  cache.clear();
  res.json({
    success: true,
    message: `Cache cleared (${previousSize} items removed)`,
  });
});

export default router;
