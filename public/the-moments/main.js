const filterButtons = document.querySelectorAll(".filter-button");
const reviewCards = document.querySelectorAll(".review-card");
const galleryStorageKey = "the-moments-slide-gallery-v1";
const maxGalleryItems = 10;
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
const galleryAdminList = document.querySelector("[data-gallery-admin-list]");
const galleryUpload = document.querySelector("[data-gallery-upload]");
const galleryReset = document.querySelector("[data-gallery-reset]");
const galleryStatus = document.querySelector("[data-gallery-status]");
const galleryPrev = document.querySelector("[data-gallery-prev]");
const galleryNext = document.querySelector("[data-gallery-next]");

let galleryItems = loadGalleryItems();
let galleryIndex = 0;

function loadGalleryItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(galleryStorageKey) || "null");
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.slice(0, maxGalleryItems);
    }
  } catch {
    localStorage.removeItem(galleryStorageKey);
  }

  return defaultGalleryItems;
}

function saveGalleryItems() {
  try {
    localStorage.setItem(galleryStorageKey, JSON.stringify(galleryItems));
    return true;
  } catch {
    if (galleryStatus) {
      galleryStatus.textContent = "브라우저 저장 공간이 부족합니다. 이미지를 일부 삭제한 뒤 다시 시도해 주세요.";
    }
    return false;
  }
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

function renderGallery() {
  if (!galleryImage || !galleryDots || !galleryAdminList) return;

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

  galleryAdminList.innerHTML = galleryItems
    .map(
      (item, index) => `
        <article class="gallery-admin-item">
          <img src="${item.src}" alt="${item.alt || "업로드 이미지"}" />
          <label>
            <input type="radio" name="gallery-focal" data-gallery-focal="${index}" ${item.focal ? "checked" : ""} />
            대표 포컬
          </label>
          <label>
            <input type="checkbox" data-gallery-visible="${index}" ${item.visible ? "checked" : ""} />
            노출
          </label>
          <button type="button" data-gallery-remove="${index}">삭제</button>
        </article>
      `,
    )
    .join("");

  if (galleryStatus) {
    galleryStatus.textContent = `${galleryItems.length}/${maxGalleryItems}장 사용 중입니다. 업로드 이미지는 이 브라우저에 저장됩니다.`;
  }
}

function cropFileToSquareDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const size = Math.min(image.width, image.height);
        const sourceX = Math.floor((image.width - size) / 2);
        const sourceY = Math.floor((image.height - size) / 2);
        const outputSize = 760;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = outputSize;
        canvas.height = outputSize;
        context.drawImage(image, sourceX, sourceY, size, size, 0, 0, outputSize, outputSize);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

galleryAdminList?.addEventListener("change", (event) => {
  const focalInput = event.target.closest("[data-gallery-focal]");
  const visibleInput = event.target.closest("[data-gallery-visible]");

  if (focalInput) {
    const focalIndex = Number(focalInput.dataset.galleryFocal);
    galleryItems = galleryItems.map((item, index) => ({ ...item, focal: index === focalIndex }));
    galleryIndex = 0;
  }

  if (visibleInput) {
    const visibleIndex = Number(visibleInput.dataset.galleryVisible);
    galleryItems[visibleIndex].visible = visibleInput.checked;
  }

  if (saveGalleryItems()) {
    renderGallery();
  }
});

galleryAdminList?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-gallery-remove]");
  if (!removeButton) return;

  const removeIndex = Number(removeButton.dataset.galleryRemove);
  const wasFocal = galleryItems[removeIndex]?.focal;
  galleryItems.splice(removeIndex, 1);

  if (galleryItems.length > 0 && wasFocal) {
    galleryItems[0].focal = true;
  }

  galleryIndex = 0;
  if (saveGalleryItems()) {
    renderGallery();
  }
});

galleryUpload?.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  const remainingSlots = maxGalleryItems - galleryItems.length;
  const selectedFiles = files.slice(0, Math.max(remainingSlots, 0));

  if (remainingSlots <= 0) {
    if (galleryStatus) galleryStatus.textContent = "최대 10장까지 업로드할 수 있습니다.";
    event.target.value = "";
    return;
  }

  if (galleryStatus) galleryStatus.textContent = "이미지를 1:1로 크롭해 저장하는 중입니다...";

  let addedCount = 0;

  for (const file of selectedFiles) {
    const src = await cropFileToSquareDataUrl(file);
    galleryItems.push({
      id: `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      src,
      alt: file.name.replace(/\.[^.]+$/, "") || "업로드 갤러리 이미지",
      visible: true,
      focal: galleryItems.length === 0,
    });
    addedCount += 1;
  }

  if (!saveGalleryItems()) {
    galleryItems.splice(galleryItems.length - addedCount, addedCount);
  }
  event.target.value = "";
  renderGallery();
});

galleryReset?.addEventListener("click", () => {
  galleryItems = defaultGalleryItems;
  galleryIndex = 0;
  localStorage.removeItem(galleryStorageKey);
  renderGallery();
});

renderGallery();
