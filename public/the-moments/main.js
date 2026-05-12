const filterButtons = document.querySelectorAll(".filter-button");
const reviewCards = document.querySelectorAll(".review-card");
const galleryApiPath = "/api/the-moments/gallery";
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
const galleryAdminPin = document.querySelector("[data-gallery-admin-pin]");

let galleryItems = defaultGalleryItems;
let galleryIndex = 0;

function getAdminPin() {
  return galleryAdminPin?.value?.trim() || "";
}

function setGalleryStatus(message) {
  if (galleryStatus) {
    galleryStatus.textContent = message;
  }
}

async function requestGallery(path = galleryApiPath, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "갤러리 요청에 실패했습니다.");
  }

  return data;
}

async function loadGalleryItems() {
  try {
    const data = await requestGallery();
    galleryItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : defaultGalleryItems;
    if (data.warning) {
      setGalleryStatus(data.warning);
    } else {
      setGalleryStatus(`${galleryItems.length}/${maxGalleryItems}장 사용 중입니다.`);
    }
  } catch (error) {
    galleryItems = defaultGalleryItems;
    setGalleryStatus(error.message || "기본 갤러리를 표시합니다.");
  }

  galleryIndex = 0;
  renderGallery();
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
      (item) => `
        <article class="gallery-admin-item">
          <img src="${item.src}" alt="${item.alt || "업로드 이미지"}" />
          <label>
            <input type="radio" name="gallery-focal" data-gallery-focal="${item.id}" ${item.focal ? "checked" : ""} />
            대표 포컬
          </label>
          <label>
            <input type="checkbox" data-gallery-visible="${item.id}" ${item.visible ? "checked" : ""} />
            노출
          </label>
          <button type="button" data-gallery-remove="${item.id}">삭제</button>
        </article>
      `,
    )
    .join("");
}

function cropFileToSquareBlob(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const size = Math.min(image.width, image.height);
        const sourceX = Math.floor((image.width - size) / 2);
        const sourceY = Math.floor((image.height - size) / 2);
        const outputSize = 900;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = outputSize;
        canvas.height = outputSize;
        context.drawImage(image, sourceX, sourceY, size, size, 0, 0, outputSize, outputSize);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("이미지 변환에 실패했습니다."));
            }
          },
          "image/jpeg",
          0.8,
        );
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

galleryAdminList?.addEventListener("change", async (event) => {
  const focalInput = event.target.closest("[data-gallery-focal]");
  const visibleInput = event.target.closest("[data-gallery-visible]");
  const id = focalInput?.dataset.galleryFocal || visibleInput?.dataset.galleryVisible;

  if (!id) return;

  try {
    setGalleryStatus("갤러리 설정을 저장하는 중입니다...");
    const data = await requestGallery(galleryApiPath, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-gallery-admin-pin": getAdminPin(),
      },
      body: JSON.stringify({
        id,
        focal: focalInput ? true : undefined,
        visible: visibleInput ? visibleInput.checked : undefined,
      }),
    });

    galleryItems = data.items;
    galleryIndex = 0;
    setGalleryStatus(`${galleryItems.length}/${maxGalleryItems}장 사용 중입니다.`);
    renderGallery();
  } catch (error) {
    setGalleryStatus(error.message || "갤러리 설정을 저장하지 못했습니다.");
    renderGallery();
  }
});

galleryAdminList?.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-gallery-remove]");
  if (!removeButton) return;

  try {
    setGalleryStatus("이미지를 삭제하는 중입니다...");
    const data = await requestGallery(`${galleryApiPath}?id=${encodeURIComponent(removeButton.dataset.galleryRemove)}`, {
      method: "DELETE",
      headers: {
        "x-gallery-admin-pin": getAdminPin(),
      },
    });

    galleryItems = data.items;
    galleryIndex = 0;
    setGalleryStatus(`${galleryItems.length}/${maxGalleryItems}장 사용 중입니다.`);
    renderGallery();
  } catch (error) {
    setGalleryStatus(error.message || "이미지를 삭제하지 못했습니다.");
  }
});

galleryUpload?.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  const remainingSlots = maxGalleryItems - galleryItems.length;
  const selectedFiles = files.slice(0, Math.max(remainingSlots, 0));

  if (remainingSlots <= 0) {
    setGalleryStatus("최대 10장까지 업로드할 수 있습니다.");
    event.target.value = "";
    return;
  }

  try {
    for (const file of selectedFiles) {
      setGalleryStatus(`${file.name} 이미지를 1:1로 크롭해 업로드하는 중입니다...`);
      const blob = await cropFileToSquareBlob(file);
      const formData = new FormData();
      formData.append("image", blob, file.name.replace(/\.[^.]+$/, ".jpg"));
      formData.append("alt", file.name.replace(/\.[^.]+$/, "") || "The Moments 갤러리 이미지");

      const data = await requestGallery(galleryApiPath, {
        method: "POST",
        headers: {
          "x-gallery-admin-pin": getAdminPin(),
        },
        body: formData,
      });

      galleryItems = data.items;
    }

    galleryIndex = 0;
    setGalleryStatus(`${galleryItems.length}/${maxGalleryItems}장 사용 중입니다.`);
    renderGallery();
  } catch (error) {
    setGalleryStatus(error.message || "이미지를 업로드하지 못했습니다.");
  }

  event.target.value = "";
});

galleryReset?.addEventListener("click", async () => {
  await loadGalleryItems();
});

loadGalleryItems();
