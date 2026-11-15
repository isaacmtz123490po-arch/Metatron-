// ==================== DOM Elements ====================
const playerContainer = document.getElementById("playerContainer");
const placeholder = document.getElementById("placeholder");
const streamLoading = document.getElementById("streamLoading");
const reloadBtn = document.getElementById("reloadBtn");
const toggleChatBtn = document.getElementById("toggleChatBtn");
const channelInput = document.getElementById("channelInput");
const goBtn = document.getElementById("goBtn");
const channelList = document.getElementById("channelList");
const favoritesList = document.getElementById("favoritesList");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const muteBtn = document.getElementById("muteBtn");
const pipBtn = document.getElementById("pipBtn");
const chatBtn = document.getElementById("chatBtn");
const reloadOverlayBtn = document.getElementById("reloadOverlayBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const chatSection = document.getElementById("chatSection");
const chatCloseBtn = document.getElementById("chatCloseBtn");
const chatIframeContainer = document.getElementById("chatIframeContainer");
const chatPlaceholder = document.getElementById("chatPlaceholder");
const toast = document.getElementById("toast");

// ==================== State ====================
let currentChannel = null;
let isMuted = false;
let pipWindow = null;
let isChatVisible = false;

const STORAGE_KEYS = {
  HISTORY: "kickPlayer_history",
  FAVORITES: "kickPlayer_favorites",
  CHAT_ENABLED: "kickPlayer_chatEnabled",
};

const MAX_HISTORY = 10;

const defaultChannels = [
  "xqc",
  "adinross",
  "trainwreckstv",
  "stake",
  "kick",
  "drdisrespect",
  "amouranth",
  "roshtein",
];

// ==================== Toast Notifications ====================

let toastTimeout = null;
function showToast(message, duration = 2000) {
  toast.textContent = message;
  toast.classList.add("show");
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// ==================== Storage Functions ====================

function loadFromStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn(`Failed to load ${key} from localStorage:`, e);
    return [];
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

function getHistory() {
  return loadFromStorage(STORAGE_KEYS.HISTORY);
}

function getFavorites() {
  return loadFromStorage(STORAGE_KEYS.FAVORITES);
}

function isChatEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEYS.CHAT_ENABLED) === "true";
  } catch (e) {
    return false;
  }
}

function setChatEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEYS.CHAT_ENABLED, enabled.toString());
  } catch (e) {
    console.warn("Failed to save chat state:", e);
  }
}

// ==================== History Functions ====================

function addToHistory(channel) {
  if (!channel) return;
  let history = getHistory();
  history = history.filter((ch) => ch !== channel);
  history.unshift(channel);
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }
  saveToStorage(STORAGE_KEYS.HISTORY, history);
  renderHistory();
}

function clearHistory() {
  if (!confirm("¿Quieres borrar el historial de canales?")) return;
  saveToStorage(STORAGE_KEYS.HISTORY, []);
  renderHistory();
  showToast("Historial borrado");
}

// ==================== Favorites Functions ====================

function toggleFavorite(channel) {
  if (!channel) return;
  let favorites = getFavorites();
  if (favorites.includes(channel)) {
    favorites = favorites.filter((f) => f !== channel);
    showToast(`Quitaste ${channel} de favoritos`);
  } else {
    favorites.push(channel);
    showToast(`Añadiste ${channel} a favoritos`);
  }
  saveToStorage(STORAGE_KEYS.FAVORITES, favorites);
  renderFavorites();
  renderHistory();
  renderChannelList(defaultChannels);
}

function isFavorite(channel) {
  return getFavorites().includes(channel);
}

// ==================== Render Functions ====================

function createChannelButton(channelName, showFavoriteBtn = true) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "inline-flex";
  wrapper.style.alignItems = "center";
  wrapper.style.backgroundColor = "#2f2f35";
  wrapper.style.borderRadius = "20px";
  wrapper.style.padding = "2px 4px 2px 0";

  const btn = document.createElement("button");
  btn.className = "channel-btn";
  btn.textContent = channelName;
  btn.style.borderRadius = "20px 0 0 20px";
  btn.style.margin = "0";
  if (currentChannel === channelName) {
    btn.classList.add("active");
  }
  btn.addEventListener("click", () => loadChannel(channelName));

  wrapper.appendChild(btn);

  if (showFavoriteBtn) {
    const favBtn = document.createElement("button");
    favBtn.className = "favorite-btn";
    if (isFavorite(channelName)) {
      favBtn.classList.add("active");
      favBtn.textContent = "★";
      favBtn.title = "Quitar de favoritos";
    } else {
      favBtn.textContent = "☆";
      favBtn.title = "Añadir a favoritos";
    }
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(channelName);
    });
    wrapper.appendChild(favBtn);
  }

  return wrapper;
}

function renderFavorites() {
  const favorites = getFavorites();
  favoritesList.innerHTML = "";

  if (favorites.length === 0) {
    favoritesList.innerHTML =
      '<p class="empty-state">Aún no hay favoritos. Toca ☆ en un canal para guardarlo.</p>';
    return;
  }

  favorites.forEach((channelName) => {
    favoritesList.appendChild(createChannelButton(channelName, true));
  });
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML =
      '<p class="empty-state">Aquí aparecerán los canales que visites.</p>';
    return;
  }

  history.forEach((channelName) => {
    historyList.appendChild(createChannelButton(channelName, true));
  });
}

function renderChannelList(channels) {
  channelList.innerHTML = "";

  if (channels.length === 0) {
    channelList.innerHTML = '<p class="empty-state">No hay canales para mostrar.</p>';
    return;
  }

  channels.forEach((channelName) => {
    channelList.appendChild(createChannelButton(channelName, true));
  });
}

// ==================== Player Functions ====================

function buildEmbedUrl(channel, muted = false) {
  let url = `https://player.kick.com/${channel}`;
  if (muted) {
    url += "?muted=true";
  }
  return url;
}

function loadChannel(channel) {
  if (!channel || channel.trim() === "") {
    showToast("Escribe el nombre de un canal de Kick");
    channelInput.focus();
    return;
  }

  const normalizedChannel = channel.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_]{1,25}$/.test(normalizedChannel)) {
    showToast("Ese nombre no parece válido. Usa solo letras, números o _");
    channelInput.focus();
    return;
  }

  currentChannel = normalizedChannel;
  channelInput.value = currentChannel;

  addToHistory(currentChannel);

  if (placeholder) {
    placeholder.style.display = "none";
  }

  const existingIframe = playerContainer.querySelector("iframe");
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.src = buildEmbedUrl(currentChannel, isMuted);
  iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media; web-share";
  iframe.allowFullscreen = true;
  iframe.loading = "eager";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.title = `Reproductor Kick de ${currentChannel}`;
  iframe.addEventListener("load", () => { if (streamLoading) streamLoading.hidden = true; });
  playerContainer.appendChild(iframe);
  if (streamLoading) streamLoading.hidden = false;
  playerContainer.dataset.channel = currentChannel;
  playerContainer.classList.add("is-playing");

  // Update chat if visible
  if (isChatVisible) {
    loadChat();
  }

  renderFavorites();
  renderHistory();
  renderChannelList(defaultChannels);

  showToast(`Reproduciendo: ${currentChannel}`);
}

function reloadPlayer() {
  if (currentChannel) {
    loadChannel(currentChannel);
    showToast("Reproductor recargado");
  } else {
    showToast("No hay ningún canal seleccionado");
  }
}

// ==================== Chat Functions ====================

function toggleChat() {
  isChatVisible = !isChatVisible;
  chatSection.classList.toggle("visible", isChatVisible);
  chatIframeContainer.classList.toggle("active", isChatVisible);
  setChatEnabled(isChatVisible);

  toggleChatBtn.querySelector("span").textContent = isChatVisible ? "Cerrar chat" : "Abrir chat";
  toggleChatBtn.setAttribute("aria-expanded", String(isChatVisible));
  if (isChatVisible) {
    loadChat();
    showToast("Chat de Kick abierto");
  } else {
    unloadChat();
    showToast("Chat de Kick cerrado");
  }
}

function loadChat() {
  if (!currentChannel) {
    chatPlaceholder.style.display = "flex";
    return;
  }

  chatPlaceholder.style.display = "none";

  // Remove existing chat iframe
  const existingChat = chatIframeContainer.querySelector("iframe");
  if (existingChat) {
    existingChat.remove();
  }

  // Create chat iframe
  const chatIframe = document.createElement("iframe");
  chatIframe.src = `https://chat.kick.cx/embed/${currentChannel}`;
  chatIframe.allow = "autoplay; clipboard-read; clipboard-write";
  chatIframe.loading = "eager";
  chatIframe.referrerPolicy = "strict-origin-when-cross-origin";
  chatIframe.title = `Chat de Kick de ${currentChannel}`;
  chatIframeContainer.appendChild(chatIframe);
}

function unloadChat() {
  const existingChat = chatIframeContainer.querySelector("iframe");
  if (existingChat) {
    existingChat.remove();
  }
  chatPlaceholder.style.display = "flex";
}

// ==================== Mute Toggle ====================

function toggleMute() {
  if (!currentChannel) {
    showToast("Primero elige un canal");
    return;
  }
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? "🔇" : "🔊";
  muteBtn.classList.toggle("active", isMuted);

  const iframe = playerContainer.querySelector("iframe");
  if (iframe) {
    iframe.src = buildEmbedUrl(currentChannel, isMuted);
  }
  showToast(isMuted ? "Silenciado" : "Sonido activado");
}

// ==================== Picture-in-Picture ====================

function openPiP() {
  if (!currentChannel) {
    showToast("Primero elige un canal");
    return;
  }
  if (window.matchMedia("(max-width: 700px)").matches) {
    showToast("En Android usa pantalla completa desde el reproductor");
    return;
  }

  if (pipWindow && !pipWindow.closed) {
    pipWindow.focus();
    showToast("La ventana flotante ya está abierta");
    return;
  }

  const width = 480;
  const height = 270;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  const pipHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Kick PiP - ${currentChannel}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { background: #000; overflow: hidden; }
                        iframe { width: 100vw; height: 100vh; border: none; }
                    </style>
                </head>
                <body>
                    <iframe 
                        src="${buildEmbedUrl(currentChannel, isMuted)}" 
                        allow="autoplay; fullscreen" 
                        allowfullscreen>
                    </iframe>
                </body>
                </html>
            `;
  pipWindow = window.open(
    "",
    "kickPipWindow",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes`,
  );

  if (pipWindow) {
    pipWindow.document.write(pipHtml);
    pipWindow.document.close();
    pipBtn.classList.add("active");
    showToast("Ventana flotante abierta");

    const checkClosed = setInterval(() => {
      if (pipWindow.closed) {
        clearInterval(checkClosed);
        pipWindow = null;
        pipBtn.classList.remove("active");
      }
    }, 1000);
  } else {
    showToast("El navegador bloqueó la ventana emergente");
  }
}

// ==================== Fullscreen ====================

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const target = playerContainer.requestFullscreen ? playerContainer : playerContainer.querySelector("iframe");
    if (!target) {
      showToast("Elige un canal antes de abrir pantalla completa");
      return;
    }
    const enterFullscreen = target.requestFullscreen || target.webkitRequestFullscreen;
    if (!enterFullscreen) {
      showToast("Usa el botón ⛶ del reproductor de Kick");
      return;
    }
    Promise.resolve(enterFullscreen.call(target))
      .then(() => {
        fullscreenBtn.classList.add("active");
        showToast("Pantalla completa activada");
      })
      .catch((err) => {
        showToast("No se pudo abrir pantalla completa: " + err.message);
      });
  } else {
    document.exitFullscreen().then(() => {
      fullscreenBtn.classList.remove("active");
      showToast("Pantalla completa cerrada");
    });
  }
}

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    fullscreenBtn.classList.remove("active");
  }
});

// ==================== Keyboard Shortcuts ====================

function isTypingInInput() {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || active.isContentEditable;
}

document.addEventListener("keydown", (e) => {
  if (isTypingInInput()) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  const key = e.key.toLowerCase();

  switch (key) {
    case "f":
      e.preventDefault();
      toggleFullscreen();
      break;
    case "m":
      e.preventDefault();
      toggleMute();
      break;
    case "p":
      e.preventDefault();
      openPiP();
      break;
    case "r":
      e.preventDefault();
      reloadPlayer();
      break;
    case "c":
      e.preventDefault();
      toggleChat();
      break;
    case "escape":
      break;
  }
});

// ==================== Event Listeners ====================

goBtn.addEventListener("click", () => {
  loadChannel(channelInput.value);
});

channelInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    loadChannel(channelInput.value);
  }
});

reloadBtn.addEventListener("click", reloadPlayer);
toggleChatBtn.addEventListener("click", toggleChat);
clearHistoryBtn.addEventListener("click", clearHistory);

muteBtn.addEventListener("click", toggleMute);
pipBtn.addEventListener("click", openPiP);
reloadOverlayBtn.addEventListener("click", reloadPlayer);
fullscreenBtn.addEventListener("click", toggleFullscreen);

// ==================== Initialization ====================

document.addEventListener("DOMContentLoaded", () => {
  renderFavorites();
  renderHistory();
  renderChannelList(defaultChannels);

  // Restore chat visibility preference; do not load a chat iframe until a channel is chosen.
  if (isChatEnabled()) {
    isChatVisible = true;
    chatSection.classList.add("visible");
    chatIframeContainer.classList.add("active");
    toggleChatBtn.querySelector("span").textContent = "Cerrar chat";
    toggleChatBtn.setAttribute("aria-expanded", "true");
  }
  channelInput.addEventListener("input", () => channelInput.classList.remove("invalid"));
});
