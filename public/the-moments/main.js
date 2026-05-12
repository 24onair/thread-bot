const filterButtons = document.querySelectorAll(".filter-button");
const reviewCards = document.querySelectorAll(".review-card");
const galleryApiPath = "/api/the-moments/gallery";
const defaultGalleryItems = [
  {
    id: "default-6",
    src: "./assets/tmom-6.jpg",
    alt: "선반 위에 놓인 The Moments 블럭 액자",
    visible: true,
    focal: true,
  },
  {
    id: "default-2",
    src: "./assets/tmom-2.jpg",
    alt: "가족 사진으로 구성된 The Moments 블럭 액자",
    visible: true,
    focal: false,
  },
  {
    id: "default-0",
    src: "./assets/tmom-0.jpg",
    alt: "반려견 사진으로 구성된 The Moments 블럭 액자",
    visible: true,
    focal: false,
  },
];

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    reviewCards.forEach((card) => {
      const shouldShow = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

const galleryImage = document.querySelector("[data-gallery-image]");
const galleryCaption = document.querySelector("[data-gallery-caption]");
const galleryDots = document.querySelector("[data-gallery-dots]");
const galleryPrev = document.querySelector("[data-gallery-prev]");
const galleryNext = document.querySelector("[data-gallery-next]");
const downloadPanel = document.querySelector("[data-download-panel]");
const downloadLink = document.querySelector("[data-download-link]");

let galleryItems = defaultGalleryItems;
let galleryIndex = 0;

async function requestGallery(path = galleryApiPath, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "갤러리 요청에 실패했습니다.");
  }

  return data;
}

function getVisibleGalleryItems() {
  const visibleItems = galleryItems.filter((item) => item.visible);
  return visibleItems.length > 0 ? visibleItems : galleryItems.slice(0, 1);
}

function getOrderedVisibleGalleryItems() {
  const visibleItems = getVisibleGalleryItems();
  const focalIndex = visibleItems.findIndex((item) => item.focal);

  if (focalIndex <= 0) return visibleItems;

  return [
    visibleItems[focalIndex],
    ...visibleItems.slice(0, focalIndex),
    ...visibleItems.slice(focalIndex + 1),
  ];
}

function renderDownloadLink(downloadUrl = "") {
  if (!downloadPanel || !downloadLink) return;

  const hasDownloadUrl = downloadUrl.trim().length > 0;
  downloadPanel.hidden = !hasDownloadUrl;
  downloadLink.href = hasDownloadUrl ? downloadUrl : "#";
}

function renderGallery() {
  if (!galleryImage || !galleryDots) return;

  const visibleItems = getOrderedVisibleGalleryItems();
  galleryIndex = Math.min(galleryIndex, visibleItems.length - 1);
  const activeItem = visibleItems[galleryIndex];

  galleryImage.src = activeItem.src;
  galleryImage.alt = activeItem.alt || "The Moments 갤러리 이미지";
  if (galleryCaption) {
    galleryCaption.textContent = activeItem.focal ? "대표 포컬 이미지" : `${galleryIndex + 1} / ${visibleItems.length}`;
  }

  galleryDots.innerHTML = visibleItems
    .map(
      (_, index) =>
        `<button class="slider-dot${index === galleryIndex ? " active" : ""}" type="button" data-gallery-dot="${index}" aria-label="${index + 1}번째 이미지 보기"></button>`,
    )
    .join("");
}

async function loadGalleryItems() {
  try {
    const data = await requestGallery();
    galleryItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : defaultGalleryItems;
    renderDownloadLink(typeof data.downloadUrl === "string" ? data.downloadUrl : "");
  } catch {
    galleryItems = defaultGalleryItems;
    renderDownloadLink("");
  }

  galleryIndex = 0;
  renderGallery();
}

galleryDots?.addEventListener("click", (event) => {
  const dot = event.target.closest("[data-gallery-dot]");
  if (!dot) return;

  galleryIndex = Number(dot.dataset.galleryDot);
  renderGallery();
});

galleryPrev?.addEventListener("click", () => {
  const visibleItems = getOrderedVisibleGalleryItems();
  galleryIndex = (galleryIndex - 1 + visibleItems.length) % visibleItems.length;
  renderGallery();
});

galleryNext?.addEventListener("click", () => {
  const visibleItems = getOrderedVisibleGalleryItems();
  galleryIndex = (galleryIndex + 1) % visibleItems.length;
  renderGallery();
});

loadGalleryItems();
