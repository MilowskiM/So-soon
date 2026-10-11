const TARGET_DATE = new Date("2026-10-30T19:30:00-04:00");

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const pad = (value, width = 2) => String(value).padStart(width, "0");

let photos = [];
let wheelIndex = 0;
let lightboxIndex = 0;
let dragStart = null;
let dragDistance = 0;
let favorites = new Set(JSON.parse(localStorage.getItem("our-bouquet") || "[]"));

function updateCountdown() {
  const remaining = Math.max(0, TARGET_DATE.getTime() - Date.now());
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  const hundredths = Math.floor((remaining % 1_000) / 10);

  $("#days").textContent = pad(days);
  $("#hours").textContent = pad(hours);
  $("#minutes").textContent = pad(minutes);
  $("#seconds").textContent = pad(seconds);
  $("#hundredths").textContent = pad(hundredths);

  if (remaining === 0) {
    $("#countdown").innerHTML = '<div class="together-message">You’re together now. ♥</div>';
    $(".countdown-kicker").textContent = "The wait is over";
    clearInterval(countdownInterval);
    petalBurst(24);
  }
}

const countdownInterval = setInterval(updateCountdown, 40);
updateCountdown();

function randomIndex(except = -1) {
  if (photos.length < 2) return 0;
  let next = Math.floor(Math.random() * photos.length);
  while (next === except) next = Math.floor(Math.random() * photos.length);
  return next;
}

function setHeroPhoto(button, index, animate = true) {
  if (!photos.length) return;
  const safeIndex = ((index % photos.length) + photos.length) % photos.length;
  if (animate) button.classList.add("swapping");
  window.setTimeout(() => {
    button.querySelector("img").src = photos[safeIndex].thumb;
    button.dataset.photoIndex = safeIndex;
  }, animate ? 240 : 0);
  window.setTimeout(() => button.classList.remove("swapping"), 560);
}

function populateHero() {
  const preferred = [3, 18, 41];
  $$("[data-hero-slot]").forEach((button, index) => {
    setHeroPhoto(button, preferred[index] % photos.length, false);
    button.addEventListener("click", () => setHeroPhoto(button, randomIndex(Number(button.dataset.photoIndex))));
  });
}

function circularOffset(index, center) {
  let offset = index - center;
  const half = photos.length / 2;
  if (offset > half) offset -= photos.length;
  if (offset < -half) offset += photos.length;
  return offset;
}

function renderWheel() {
  const stage = $("#wheelStage");
  stage.innerHTML = "";
  const spread = window.innerWidth < 620 ? 94 : window.innerWidth < 900 ? 126 : 158;

  photos.forEach((photo, index) => {
    const offset = circularOffset(index, wheelIndex);
    if (Math.abs(offset) > 4) return;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "wheel-card" + (offset === 0 ? " is-center" : "");
    card.dataset.label = `memory ${pad(index + 1)}`;
    card.setAttribute("aria-label", offset === 0 ? `Open memory ${index + 1}` : `Bring memory ${index + 1} forward`);
    const x = offset * spread;
    const y = Math.abs(offset) * 18;
    const scale = Math.max(.64, 1 - Math.abs(offset) * .105);
    const rotate = offset * (window.innerWidth < 620 ? 5 : 7);
    card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`;
    card.style.opacity = String(Math.max(.18, 1 - Math.abs(offset) * .2));
    card.style.filter = `saturate(${Math.max(.65, 1 - Math.abs(offset) * .08)})`;
    card.style.zIndex = String(10 - Math.abs(offset));
    card.innerHTML = `<img src="${photo.thumb}" alt="Memory ${index + 1}" draggable="false" loading="lazy">`;
    card.addEventListener("click", () => {
      if (Math.abs(dragDistance) > 8) return;
      if (index === wheelIndex) openLightbox(index);
      else setWheel(index);
    });
    stage.appendChild(card);
  });

  $("#wheelCounter").textContent = `${pad(wheelIndex + 1)} / ${pad(photos.length)}`;
}

function setWheel(index) {
  wheelIndex = (index + photos.length) % photos.length;
  renderWheel();
}

function moveWheel(delta) {
  setWheel(wheelIndex + delta);
}

function openLightbox(index) {
  lightboxIndex = (index + photos.length) % photos.length;
  const photo = photos[lightboxIndex];
  $("#lightboxImage").src = photo.src;
  $("#lightboxNumber").textContent = `memory ${pad(lightboxIndex + 1)} of ${pad(photos.length)}`;
  updateFavoriteButton();
  if (!$("#lightbox").open) $("#lightbox").showModal();
}

function updateFavoriteButton() {
  const selected = favorites.has(lightboxIndex);
  const button = $("#favoriteButton");
  button.setAttribute("aria-pressed", String(selected));
  button.children[0].textContent = selected ? "♥" : "♡";
  button.children[1].textContent = selected ? "in our bouquet" : "add to our bouquet";
}

function persistFavorites() {
  localStorage.setItem("our-bouquet", JSON.stringify([...favorites]));
  $("#bouquetCount").textContent = favorites.size;
}

function toggleFavorite() {
  if (favorites.has(lightboxIndex)) favorites.delete(lightboxIndex);
  else {
    favorites.add(lightboxIndex);
    petalBurst(12);
  }
  persistFavorites();
  updateFavoriteButton();
}

function renderBouquet() {
  const grid = $("#bouquetGrid");
  grid.innerHTML = "";
  const saved = [...favorites].filter((index) => photos[index]);
  $("#bouquetEmpty").hidden = saved.length > 0;
  saved.forEach((index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Open saved memory ${index + 1}`);
    button.innerHTML = `<img src="${photos[index].thumb}" alt="Saved memory ${index + 1}">`;
    button.addEventListener("click", () => {
      $("#bouquetDialog").close();
      openLightbox(index);
    });
    grid.appendChild(button);
  });
}

function petalBurst(count = 14) {
  const layer = $(".petal-layer");
  const colors = ["#e6b5bc", "#f0d38a", "#c8bdd7", "#efc0a4", "#dbe5cc"];
  for (let i = 0; i < count; i += 1) {
    const petal = document.createElement("span");
    petal.className = "falling-petal";
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.setProperty("--duration", `${5 + Math.random() * 5}s`);
    petal.style.setProperty("--delay", `${Math.random() * .8}s`);
    petal.style.setProperty("--drift", `${-120 + Math.random() * 240}px`);
    petal.style.setProperty("--petal-color", colors[Math.floor(Math.random() * colors.length)]);
    layer.appendChild(petal);
    window.setTimeout(() => petal.remove(), 11_000);
  }
}

async function initialize() {
  photos = await fetch("photos.json").then((response) => response.json());
  favorites = new Set([...favorites].filter((index) => index >= 0 && index < photos.length));
  persistFavorites();
  populateHero();
  renderWheel();

  $("#previousButton").addEventListener("click", () => moveWheel(-1));
  $("#nextButton").addEventListener("click", () => moveWheel(1));
  $("#surpriseButton").addEventListener("click", () => {
    const chosen = randomIndex(wheelIndex);
    setWheel(chosen);
    $("#memories").scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => openLightbox(chosen), 650);
    petalBurst(8);
  });
  $("#backToCountdown").addEventListener("click", () => $("#top").scrollIntoView({ behavior: "smooth" }));

  const stage = $("#wheelStage");
  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") moveWheel(-1);
    if (event.key === "ArrowRight") moveWheel(1);
    if (event.key === "Enter" || event.key === " ") openLightbox(wheelIndex);
  });
  stage.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaX) + Math.abs(event.deltaY) < 12) return;
    event.preventDefault();
    moveWheel(event.deltaX + event.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  stage.addEventListener("pointerdown", (event) => {
    dragStart = event.clientX;
    dragDistance = 0;
    stage.classList.add("dragging");
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", (event) => {
    if (dragStart === null) return;
    dragDistance = event.clientX - dragStart;
  });
  stage.addEventListener("pointerup", (event) => {
    if (Math.abs(dragDistance) > 35) moveWheel(dragDistance < 0 ? 1 : -1);
    dragStart = null;
    stage.classList.remove("dragging");
    stage.releasePointerCapture(event.pointerId);
    window.setTimeout(() => { dragDistance = 0; }, 0);
  });

  $("#lightboxClose").addEventListener("click", () => $("#lightbox").close());
  $("#lightboxPrevious").addEventListener("click", () => openLightbox(lightboxIndex - 1));
  $("#lightboxNext").addEventListener("click", () => openLightbox(lightboxIndex + 1));
  $("#favoriteButton").addEventListener("click", toggleFavorite);
  $("#lightbox").addEventListener("click", (event) => {
    if (event.target === $("#lightbox")) $("#lightbox").close();
  });
  $("#lightbox").addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") openLightbox(lightboxIndex - 1);
    if (event.key === "ArrowRight") openLightbox(lightboxIndex + 1);
  });

  $("#bouquetButton").addEventListener("click", () => {
    renderBouquet();
    $("#bouquetDialog").showModal();
  });
  $("#bouquetClose").addEventListener("click", () => $("#bouquetDialog").close());
  $("#bouquetDialog").addEventListener("click", (event) => {
    if (event.target === $("#bouquetDialog")) $("#bouquetDialog").close();
  });

  window.addEventListener("resize", renderWheel);
  window.setTimeout(() => petalBurst(9), 700);
}

initialize().catch((error) => {
  console.error(error);
  $("#wheelStage").innerHTML = "<p>Our memories are taking a moment to bloom. Please refresh the page.</p>";
});
