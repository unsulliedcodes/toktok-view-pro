// public/js/app.js - Complete Updated Version with Enhanced Error Handling

// ======================
// IMMEDIATE GLOBAL ASSIGNMENT
// ======================

// Create global objects immediately to prevent "not defined" errors
window.TokViewApp = window.TokViewApp || {};

// Temporary placeholder functions
window.APIService = window.APIService || {
  baseURL: window.location.origin,

  async request(endpoint) {
    return Promise.reject(new Error("APIService not fully loaded yet"));
  },

  async search(query) {
    return Promise.reject(new Error("APIService not fully loaded yet"));
  },

  async getTrending() {
    return Promise.reject(new Error("APIService not fully loaded yet"));
  },

  async getProfile(username) {
    return Promise.reject(new Error("APIService not fully loaded yet"));
  },

  async getHashtag(tag) {
    return Promise.reject(new Error("APIService not fully loaded yet"));
  },

  async health() {
    return Promise.reject(new Error("APIService not fully loaded yet"));
  },
};

window.VideoRenderer = window.VideoRenderer || {
  renderVideos(videos, container) {
    console.error("VideoRenderer not fully loaded yet");
    container.innerHTML = '<div class="error">VideoRenderer loading...</div>';
  },

  renderVideo(video) {
    return `<div>VideoRenderer loading...</div>`;
  },

  escapeHtml(unsafe) {
    return unsafe || "";
  },
};

window.Utils = window.Utils || {
  showLoading(container) {
    if (container) {
      container.innerHTML = "<div>Loading...</div>";
    }
  },

  showError(container, message) {
    if (container) {
      container.innerHTML = `<div class="error">${message}</div>`;
    }
  },

  formatNumber(num) {
    return num ? num.toString() : "0";
  },
};

console.log("🔄 TokView Pro JavaScript initializing...");

// ======================
// APP STATE
// ======================

const AppState = {
  currentPage: "home",
  isLoading: false,
  lastSearch: "",
};

// ======================
// UTILITY FUNCTIONS
// ======================

const Utils = {
  // Show loading state
  showLoading(container) {
    if (container) {
      container.innerHTML = `
                <div class="loading-section">
                    <div class="loading-spinner"></div>
                    <p>Loading content...</p>
                </div>
            `;
    }
    AppState.isLoading = true;
  },

  // Show error state with enhanced error handling
  showError(container, message) {
    if (container) {
      let userFriendlyMessage = message;

      // Enhance error messages for better user experience
      if (
        message.includes("API authentication") ||
        message.includes("API key") ||
        message.includes("token")
      ) {
        userFriendlyMessage =
          "API configuration issue. Please check the server configuration.";
      } else if (message.includes("rate limit")) {
        userFriendlyMessage =
          "Too many requests. Please wait a few minutes and try again.";
      } else if (message.includes("not found") || message.includes("private")) {
        userFriendlyMessage = message; // Keep these as they're user-friendly
      } else if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError")
      ) {
        userFriendlyMessage =
          "Network connection failed. Please check your internet connection.";
      }

      container.innerHTML = `
                <div class="error-section">
                    <div class="error-message">
                        <h3>❌ Something went wrong</h3>
                        <p>${userFriendlyMessage}</p>
                        <div class="error-actions">
                            <button onclick="window.location.reload()" class="retry-button">
                                Try Again
                            </button>
                            <button onclick="window.location.href='/'" class="btn-secondary">
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            `;
    }
    AppState.isLoading = false;
  },

  // Format large numbers
  formatNumber(num) {
    if (!num) return "0";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  },

  // Debounce function for search
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
};

// ======================
// ENHANCED API SERVICE
// ======================

const APIService = {
  baseURL: window.location.origin,

  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`🔄 Making API request to: ${url}`);

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;

          // Handle specific API errors with user-friendly messages
          if (
            errorMessage.includes("API key") ||
            errorMessage.includes("token") ||
            errorMessage.includes("authentication") ||
            errorMessage.includes("not valid")
          ) {
            errorMessage =
              "API authentication failed. Please check server configuration.";
          } else if (
            errorMessage.includes("not found") ||
            errorMessage.includes("private")
          ) {
            // Keep these messages as they're informative
          } else if (errorMessage.includes("rate limit")) {
            errorMessage =
              "API rate limit exceeded. Please try again in a few minutes.";
          } else if (errorMessage.includes("Failed to fetch data")) {
            errorMessage =
              "Unable to fetch data from TikTok. The service might be temporarily unavailable.";
          }
        } catch (e) {
          // Not JSON response, use text
          const text = await response.text();
          errorMessage = text || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ API response received successfully");
      return data;
    } catch (error) {
      console.error("❌ API request failed:", error);

      // Enhance error messages for common network issues
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Network request failed")
      ) {
        throw new Error(
          "Network connection failed. Please check your internet connection and try again."
        );
      }

      // Re-throw enhanced errors
      throw error;
    }
  },

  async getTrending() {
    return this.request("/api/trending");
  },

  async getHashtag(tag) {
    return this.request(`/api/hashtag/${encodeURIComponent(tag)}`);
  },

  async getProfile(username) {
    return this.request(`/api/profile/${encodeURIComponent(username)}`);
  },

  async search(query) {
    return this.request(`/api/search?q=${encodeURIComponent(query)}`);
  },

  // Health check with enhanced error handling
  async health() {
    try {
      const data = await this.request("/api/health");
      console.log("✅ API Health Check:", data);
      return data;
    } catch (error) {
      console.error("❌ API Health Check Failed:", error);
      return {
        status: "Error",
        error: error.message,
        apiKeyConfigured: false,
      };
    }
  },
};

// ======================
// VIDEO RENDERER
// ======================

const VideoRenderer = {
  // Render single video card
  renderVideo(video) {
    const safeDescription = this.escapeHtml(
      video.description || "No description"
    );
    const safeSoundtrack = this.escapeHtml(video.soundtrack || "");
    const safeUsername = this.escapeHtml(video.creator.username);

    return `
            <div class="video-card" data-video-id="${video.id}">
                <div class="video-player">
                    <iframe 
                        src="https://www.tiktok.com/embed/v2/${video.id}"
                        frameborder="0" 
                        allowfullscreen
                        loading="lazy"
                        title="TikTok video by @${safeUsername}"
                    ></iframe>
                </div>
                <div class="video-info">
                    <div class="creator-info">
                        <img 
                            src="${video.creator.avatar}" 
                            alt="${safeUsername}'s avatar"
                            class="creator-avatar"
                            onerror="this.src='https://via.placeholder.com/150/1a1a1a/ffffff?text=TK'"
                        >
                        <div class="creator-details">
                            <h4 class="creator-username">@${safeUsername}</h4>
                        </div>
                    </div>
                    
                    <p class="video-description">${safeDescription}</p>
                    
                    ${
                      safeSoundtrack
                        ? `
                        <p class="video-soundtrack">
                            <strong>Sound:</strong> ${safeSoundtrack}
                        </p>
                    `
                        : ""
                    }
                    
                    <div class="video-stats">
                        <span class="stat">❤️ ${Utils.formatNumber(
                          video.likes
                        )}</span>
                        <span class="stat">💬 ${Utils.formatNumber(
                          video.comments
                        )}</span>
                        <span class="stat">🔗 ${Utils.formatNumber(
                          video.shares
                        )}</span>
                    </div>
                    
                    ${
                      video.hashtags && video.hashtags.length > 0
                        ? `
                        <div class="video-hashtags">
                            ${video.hashtags
                              .slice(0, 3)
                              .map(
                                (tag) => `
                                <a href="/hashtag/${tag}" class="hashtag">#${tag}</a>
                            `
                              )
                              .join("")}
                            ${
                              video.hashtags.length > 3
                                ? `
                                <span class="more-hashtags">+${
                                  video.hashtags.length - 3
                                } more</span>
                            `
                                : ""
                            }
                        </div>
                    `
                        : ""
                    }
                    
                    <a href="${
                      video.videoUrl
                    }" target="_blank" rel="noopener noreferrer" class="video-link">
                        Open on TikTok ↗
                    </a>
                </div>
            </div>
        `;
  },

  // Render multiple videos
  renderVideos(videos, container) {
    if (!videos || videos.length === 0) {
      container.innerHTML = `
                <div class="no-videos">
                    <div class="no-content-message">
                        <h3>📭 No Videos Found</h3>
                        <p>Try searching for a different username, hashtag, or check if the account is public.</p>
                        <div class="suggestions">
                            <p><strong>Suggestions:</strong></p>
                            <ul>
                                <li>Check the username spelling</li>
                                <li>Try a popular hashtag like #fyp or #viral</li>
                                <li>Search for public accounts like @tiktok</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
      return;
    }

    const videosHTML = videos.map((video) => this.renderVideo(video)).join("");
    container.innerHTML = videosHTML;
  },

  // Escape HTML to prevent XSS
  escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
};

// ======================
// ENHANCED PAGE HANDLERS
// ======================

const PageHandlers = {
  // Trending page handler
  async handleTrendingPage() {
    const container = document.getElementById("videos-container");
    if (!container) {
      console.error("❌ videos-container not found");
      return;
    }

    Utils.showLoading(container);

    try {
      const data = await APIService.getTrending();

      if (data.success) {
        VideoRenderer.renderVideos(data.data, container);
      } else {
        Utils.showError(
          container,
          data.error || "Failed to load trending videos"
        );
      }
    } catch (error) {
      console.error("Trending page error:", error);
      Utils.showError(
        container,
        error.message || "Failed to load trending content"
      );
    }
  },

  // Hashtag page handler
  async handleHashtagPage(tag) {
    const container = document.getElementById("videos-container");
    if (!container) {
      console.error("❌ videos-container not found");
      return;
    }

    Utils.showLoading(container);

    try {
      const data = await APIService.getHashtag(tag);

      if (data.success) {
        VideoRenderer.renderVideos(data.data, container);

        // Update page title with count
        const titleElement = document.querySelector(".page-title");
        if (titleElement && data.count) {
          titleElement.textContent = `#${tag} (${data.count} videos)`;
        }
      } else {
        Utils.showError(container, data.error || `No videos found for #${tag}`);
      }
    } catch (error) {
      console.error("Hashtag page error:", error);
      Utils.showError(
        container,
        error.message || `Failed to load content for #${tag}`
      );
    }
  },

  // Profile page handler
  async handleProfilePage(username) {
    const container = document.getElementById("videos-container");
    const profileContainer = document.getElementById("profile-container");

    if (!container) {
      console.error("❌ videos-container not found");
      return;
    }

    Utils.showLoading(container);

    try {
      const data = await APIService.getProfile(username);

      if (data.success) {
        // Render profile info if container exists
        if (profileContainer && data.profile) {
          profileContainer.innerHTML = this.renderProfile(data.profile);
          profileContainer.style.display = "block";
        }

        // Render videos
        VideoRenderer.renderVideos(data.videos, container);

        // Update page title with video count
        const titleElement = document.querySelector(".page-title");
        if (titleElement && data.videoCount) {
          titleElement.textContent = `@${username} (${data.videoCount} videos)`;
        }
      } else {
        Utils.showError(
          container,
          data.error || `Profile @${username} not found`
        );
      }
    } catch (error) {
      console.error("Profile page error:", error);
      // Enhanced error message for profile errors
      let errorMessage = error.message;
      if (error.message.includes("not found")) {
        errorMessage = `User @${username} not found. Please check the username and try again.`;
      } else if (error.message.includes("private")) {
        errorMessage = `User @${username}'s account is private and cannot be accessed.`;
      }
      Utils.showError(container, errorMessage);
    }
  },

  // Render profile information
  renderProfile(profile) {
    const safeBio = VideoRenderer.escapeHtml(profile.bio);
    const safeUsername = VideoRenderer.escapeHtml(profile.username);

    return `
            <div class="profile-header">
                <div class="profile-avatar">
                    <img 
                        src="${profile.avatar}" 
                        alt="${safeUsername}'s avatar"
                        onerror="this.src='https://via.placeholder.com/150/1a1a1a/ffffff?text=TK'"
                    >
                    ${
                      profile.verified
                        ? '<span class="verified-badge">✓</span>'
                        : ""
                    }
                </div>
                <div class="profile-info">
                    <h2 class="profile-username">@${safeUsername}</h2>
                    <p class="profile-bio">${safeBio}</p>
                    <div class="profile-stats">
                        <div class="profile-stat">
                            <span class="stat-number">${Utils.formatNumber(
                              profile.followers
                            )}</span>
                            <span class="stat-label">Followers</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-number">${Utils.formatNumber(
                              profile.following
                            )}</span>
                            <span class="stat-label">Following</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-number">${Utils.formatNumber(
                              profile.likes
                            )}</span>
                            <span class="stat-label">Likes</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
  },

  // Search page handler
  async handleSearchPage(query) {
    const container = document.getElementById("videos-container");
    if (!container) {
      console.error("❌ videos-container not found");
      return;
    }

    Utils.showLoading(container);

    try {
      const data = await APIService.search(query);

      if (data.success) {
        VideoRenderer.renderVideos(data.data, container);

        // Update search results title
        const titleElement = document.querySelector(".page-title");
        if (titleElement) {
          const resultText =
            data.count > 0 ? ` (${data.count} results)` : " (No results)";
          titleElement.textContent = `Search: "${query}"${resultText}`;
        }
      } else {
        Utils.showError(
          container,
          data.error || `No results found for "${query}"`
        );
      }
    } catch (error) {
      console.error("Search page error:", error);
      Utils.showError(
        container,
        error.message || `Search failed for "${query}"`
      );
    }
  },
};

// ======================
// LOADING MANAGER
// ======================

window.TokViewApp = {
  isReady: false,
  readyCallbacks: [],

  onReady: function (callback) {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  },

  setReady: function () {
    this.isReady = true;
    this.readyCallbacks.forEach((callback) => callback());
    this.readyCallbacks = [];
    console.log("✅ TokViewApp is ready");
  },
};

// ======================
// GLOBAL EXPORTS
// ======================

// Update global objects with the real implementations
window.APIService = APIService;
window.VideoRenderer = VideoRenderer;
window.Utils = Utils;
window.PageHandlers = PageHandlers;

// Global functions for EJS templates
window.loadTrendingVideos = PageHandlers.handleTrendingPage.bind(PageHandlers);
window.loadHashtagVideos = PageHandlers.handleHashtagPage.bind(PageHandlers);
window.loadProfileVideos = PageHandlers.handleProfilePage.bind(PageHandlers);
window.loadSearchResults = PageHandlers.handleSearchPage.bind(PageHandlers);

// Helper function for search pages
window.performSearch = function (query) {
  console.log("Global performSearch called for:", query);
  if (typeof window.PageHandlers !== "undefined") {
    window.PageHandlers.handleSearchPage(query);
  } else {
    console.error("PageHandlers not available");
  }
};

// Set ready state
window.TokViewApp.setReady();

// ======================
// ENHANCED INITIALIZATION
// ======================

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 TokView Pro Frontend Initialized");
  console.log("📍 Current origin:", window.location.origin);
  console.log(
    "✅ APIService available:",
    typeof window.APIService !== "undefined"
  );
  console.log(
    "✅ VideoRenderer available:",
    typeof window.VideoRenderer !== "undefined"
  );

  // Test API connection on startup
  console.log("🔧 Testing API connection...");
  if (typeof window.APIService !== "undefined" && window.APIService.health) {
    window.APIService.health()
      .then((data) => {
        console.log("✅ API Health Check Result:", data);

        // Log API configuration status
        if (data.apiKeyConfigured === false) {
          console.warn("⚠️ API key not properly configured on server");
        }
      })
      .catch((error) => console.error("❌ API Health Check Failed:", error));
  }

  // Add search form enhancement
  const searchForms = document.querySelectorAll('form[action="/search"]');
  searchForms.forEach((form) => {
    const input = form.querySelector('input[name="q"]');
    const button = form.querySelector('button[type="submit"]');

    if (input && button) {
      // Enable/disable button based on input
      input.addEventListener("input", function () {
        button.disabled = !this.value.trim();
      });

      // Set initial state
      button.disabled = !input.value.trim();

      // Add input validation
      input.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && !this.value.trim()) {
          e.preventDefault();
        }
      });
    }
  });

  // Add smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Make sure all external links open in new tab
  document.querySelectorAll('a[href^="http"]').forEach((link) => {
    if (link.hostname !== window.location.hostname) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
});

// Notify that app is ready
window.dispatchEvent(new CustomEvent("tokview-app-ready"));

console.log("✅ TokView Pro JavaScript fully loaded and ready");
