// public/js/app.js - Frontend JavaScript functionality

// Global app state
const AppState = {
  currentPage: "home",
  isLoading: false,
};

// Utility functions
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

  // Show error state
  showError(container, message) {
    if (container) {
      container.innerHTML = `
                <div class="error-section">
                    <div class="error-message">
                        <h3>❌ Something went wrong</h3>
                        <p>${message}</p>
                        <button onclick="window.location.reload()" class="retry-button">
                            Try Again
                        </button>
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

// API service for making requests
const APIService = {
  baseURL: "", // Same origin

  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
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
};

// Video rendering functions
const VideoRenderer = {
  // Render single video card
  renderVideo(video) {
    return `
            <div class="video-card" data-video-id="${video.id}">
                <div class="video-player">
                    <iframe 
                        src="https://www.tiktok.com/embed/v2/${video.id}"
                        frameborder="0" 
                        allowfullscreen
                        loading="lazy"
                        title="TikTok video by @${video.creator.username}"
                    ></iframe>
                </div>
                <div class="video-info">
                    <div class="creator-info">
                        <img 
                            src="${video.creator.avatar}" 
                            alt="${video.creator.username}'s avatar"
                            class="creator-avatar"
                            onerror="this.src='/images/default-avatar.png'"
                        >
                        <div class="creator-details">
                            <h4 class="creator-username">@${
                              video.creator.username
                            }</h4>
                        </div>
                    </div>
                    
                    <p class="video-description">${this.escapeHtml(
                      video.description
                    )}</p>
                    
                    ${
                      video.soundtrack
                        ? `
                        <p class="video-soundtrack">
                            <strong>Sound:</strong> ${this.escapeHtml(
                              video.soundtrack
                            )}
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
                    <p>No videos found. Try a different search.</p>
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

// Page-specific functionality
const PageHandlers = {
  // Trending page handler
  async handleTrendingPage() {
    const container = document.getElementById("videos-container");
    if (!container) return;

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
      Utils.showError(container, error.message || "Network error occurred");
    }
  },

  // Hashtag page handler
  async handleHashtagPage(tag) {
    const container = document.getElementById("videos-container");
    if (!container) return;

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
      Utils.showError(container, error.message || "Network error occurred");
    }
  },

  // Profile page handler
  async handleProfilePage(username) {
    const container = document.getElementById("videos-container");
    const profileContainer = document.getElementById("profile-container");

    if (!container) return;

    Utils.showLoading(container);

    try {
      const data = await APIService.getProfile(username);

      if (data.success) {
        // Render profile info if container exists
        if (profileContainer && data.profile) {
          profileContainer.innerHTML = this.renderProfile(data.profile);
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
      Utils.showError(container, error.message || "Network error occurred");
    }
  },

  // Render profile information
  renderProfile(profile) {
    return `
            <div class="profile-header">
                <div class="profile-avatar">
                    <img 
                        src="${profile.avatar}" 
                        alt="${profile.username}'s avatar"
                        onerror="this.src='/images/default-avatar.png'"
                    >
                    ${
                      profile.verified
                        ? '<span class="verified-badge">✓</span>'
                        : ""
                    }
                </div>
                <div class="profile-info">
                    <h2 class="profile-username">@${profile.username}</h2>
                    <p class="profile-bio">${VideoRenderer.escapeHtml(
                      profile.bio
                    )}</p>
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
    if (!container) return;

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
      Utils.showError(container, error.message || "Search failed");
    }
  },
};

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 TokView Pro Frontend Initialized");

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

// Global functions for EJS templates
window.loadTrendingVideos = PageHandlers.handleTrendingPage.bind(PageHandlers);
window.loadHashtagVideos = PageHandlers.handleHashtagPage.bind(PageHandlers);
window.loadProfileVideos = PageHandlers.handleProfilePage.bind(PageHandlers);
window.loadSearchResults = PageHandlers.handleSearchPage.bind(PageHandlers);
