const galleryApiPath = "/api/the-moments/gallery";
const maxGalleryItems = 30;

const adminPinInput = document.querySelector("[data-admin-pin]");
const adminStatus = document.querySelector("[data-admin-status]");
const adminUpload = document.querySelector("[data-admin-upload]");
const adminGallery = document.querySelector("[data-admin-gallery]");
const downloadUrlInput = document.querySelector("[data-download-url]");
const saveDownloadButton = document.querySelector("[data-save-download]");

const cropModal = document.querySelector("[data-crop-modal]");
const cropFrame = document.querySelector("[data-crop-frame]");
const cropImage = document.querySelector("[data-crop-image]");
const cropZoom = document.querySelector("[data-crop-zoom]");
const cropAlt = document.querySelector("[data-crop-alt]");
const cropSaveButtons = document.querySelectorAll("[data-crop-save]");
const cropCancelButtons = document.querySelectorAll("[data-crop-cancel]");

let galleryItems = [];
let uploadQueue = [];
let activeFile = null;
let activeImage = null;
let cropState = {
  baseScale: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
};

function getAdminPin() {
  return adminPinInput?.value?.trim() || "";
}

function setStatus(message) {
  if (adminStatus) {
    adminStatus.textContent = message;
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

function updateState(data) {
  galleryItems = Array.isArray(data.items) ? data.items : [];
  if (downloadUrlInput && typeof data.downloadUrl === "string") {
    downloadUrlInput.value = data.downloadUrl;
  }
  renderGallery();
}

function renderGallery() {
  if (!adminGallery) return;

  adminGallery.innerHTML = galleryItems
    .map(
      (item) => `
        <article class="admin-gallery-item">
          <img src="${item.src}" alt="${item.alt || "The Moments 갤러리 이미지"}" />
          <div class="admin-gallery-meta">
            <strong>${item.alt || "The Moments 갤러리 이미지"}</strong>
            <span>${item.visible ? "노출 중" : "숨김"}${item.focal ? " · 대표 포컬" : ""}</span>
          </div>
          <div class="admin-gallery-actions">
            <label>
              <input type="radio" name="gallery-focal" data-gallery-focal="${item.id}" ${item.focal ? "checked" : ""} />
              대표
            </label>
            <label>
              <input type="checkbox" data-gallery-visible="${item.id}" ${item.visible ? "checked" : ""} />
              노출
            </label>
            <button type="button" data-gallery-remove="${item.id}">삭제</button>
          </div>
        </article>
      `,
    )
    .join("");

  setStatus(`${galleryItems.length}/${maxGalleryItems}장 사용 중입니다.`);
}

async function loadGallery() {
  try {
    const data = await requestGallery();
    updateState(data);
  } catch (error) {
    setStatus(error.message || "갤러리 정보를 불러오지 못했습니다.");
  }
}

function clampCrop() {
  const frameSize = cropFrame.clientWidth;
  const renderedWidth = activeImage.width * cropState.scale;
  const renderedHeight = activeImage.height * cropState.scale;
  const minOffsetX = frameSize - renderedWidth;
  const minOffsetY = frameSize - renderedHeight;

  cropState.offsetX = Math.min(0, Math.max(minOffsetX, cropState.offsetX));
  cropState.offsetY = Math.min(0, Math.max(minOffsetY, cropState.offsetY));
}

function paintCrop() {
  if (!cropImage || !activeImage) return;

  cropImage.style.width = `${activeImage.width * cropState.scale}px`;
  cropImage.style.height = `${activeImage.height * cropState.scale}px`;
  cropImage.style.transform = `translate(${cropState.offsetX}px, ${cropState.offsetY}px)`;
}

function resetCrop() {
  const frameSize = cropFrame.clientWidth;
  cropState.baseScale = Math.max(frameSize / activeImage.width, frameSize / activeImage.height);
  cropState.scale = cropState.baseScale;
  cropState.offsetX = (frameSize - activeImage.width * cropState.scale) / 2;
  cropState.offsetY = (frameSize - activeImage.height * cropState.scale) / 2;
  cropZoom.value = "1";
  clampCrop();
  paintCrop();
}

function openCropper(file) {
  activeFile = file;
  activeImage = new Image();

  activeImage.onload = () => {
    cropImage.src = activeImage.src;
    cropAlt.value = file.name.replace(/\.[^.]+$/, "") || "The Moments 갤러리 이미지";
    cropModal.hidden = false;
    resetCrop();
  };

  activeImage.onerror = () => {
    setStatus(`${file.name} 파일을 읽지 못했습니다.`);
    processNextUpload();
  };

  activeImage.src = URL.createObjectURL(file);
}

function closeCropper() {
  cropModal.hidden = true;
  if (activeImage?.src) {
    URL.revokeObjectURL(activeImage.src);
  }
  activeFile = null;
  activeImage = null;
}

function cropToBlob() {
  return new Promise((resolve, reject) => {
    const frameSize = cropFrame.clientWidth;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const sourceX = -cropState.offsetX / cropState.scale;
    const sourceY = -cropState.offsetY / cropState.scale;
    const sourceSize = frameSize / cropState.scale;

    canvas.width = 900;
    canvas.height = 900;
    context.drawImage(activeImage, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 900, 900);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("이미지 크롭에 실패했습니다."));
        }
      },
      "image/jpeg",
      0.84,
    );
  });
}

async function uploadCroppedImage() {
  if (!activeFile) return;

  const blob = await cropToBlob();
  const formData = new FormData();
  formData.append("image", blob, activeFile.name.replace(/\.[^.]+$/, ".jpg"));
  formData.append("alt", cropAlt.value.trim() || activeFile.name.replace(/\.[^.]+$/, "") || "The Moments 갤러리 이미지");

  const data = await requestGallery(galleryApiPath, {
    method: "POST",
    headers: {
      "x-gallery-admin-pin": getAdminPin(),
    },
    body: formData,
  });

  updateState(data);
}

function processNextUpload() {
  if (uploadQueue.length === 0) {
    setStatus(`${galleryItems.length}/${maxGalleryItems}장 사용 중입니다.`);
    return;
  }

  if (galleryItems.length >= maxGalleryItems) {
    uploadQueue = [];
    setStatus("최대 30장까지 업로드할 수 있습니다.");
    return;
  }

  openCropper(uploadQueue.shift());
}

adminUpload?.addEventListener("change", (event) => {
  const remainingSlots = maxGalleryItems - galleryItems.length;
  uploadQueue = Array.from(event.target.files || []).slice(0, Math.max(remainingSlots, 0));
  event.target.value = "";

  if (!getAdminPin()) {
    setStatus("관리자 PIN을 먼저 입력해 주세요.");
    uploadQueue = [];
    return;
  }

  if (remainingSlots <= 0) {
    setStatus("최대 30장까지 업로드할 수 있습니다.");
    return;
  }

  processNextUpload();
});

saveDownloadButton?.addEventListener("click", async () => {
  try {
    setStatus("다운로드 링크를 저장하는 중입니다...");
    const data = await requestGallery(galleryApiPath, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-gallery-admin-pin": getAdminPin(),
      },
      body: JSON.stringify({
        downloadUrl: downloadUrlInput.value,
      }),
    });

    updateState(data);
    setStatus("다운로드 링크를 저장했습니다.");
  } catch (error) {
    setStatus(error.message || "다운로드 링크를 저장하지 못했습니다.");
  }
});

adminGallery?.addEventListener("change", async (event) => {
  const focalInput = event.target.closest("[data-gallery-focal]");
  const visibleInput = event.target.closest("[data-gallery-visible]");
  const id = focalInput?.dataset.galleryFocal || visibleInput?.dataset.galleryVisible;

  if (!id) return;

  try {
    setStatus("갤러리 설정을 저장하는 중입니다...");
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

    updateState(data);
  } catch (error) {
    setStatus(error.message || "갤러리 설정을 저장하지 못했습니다.");
    renderGallery();
  }
});

adminGallery?.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-gallery-remove]");
  if (!removeButton) return;

  try {
    setStatus("이미지를 삭제하는 중입니다...");
    const data = await requestGallery(`${galleryApiPath}?id=${encodeURIComponent(removeButton.dataset.galleryRemove)}`, {
      method: "DELETE",
      headers: {
        "x-gallery-admin-pin": getAdminPin(),
      },
    });

    updateState(data);
  } catch (error) {
    setStatus(error.message || "이미지를 삭제하지 못했습니다.");
  }
});

cropFrame?.addEventListener("pointerdown", (event) => {
  if (!activeImage) return;

  cropState.dragging = true;
  cropState.startX = event.clientX;
  cropState.startY = event.clientY;
  cropState.startOffsetX = cropState.offsetX;
  cropState.startOffsetY = cropState.offsetY;
  cropFrame.setPointerCapture(event.pointerId);
});

cropFrame?.addEventListener("pointermove", (event) => {
  if (!cropState.dragging) return;

  cropState.offsetX = cropState.startOffsetX + event.clientX - cropState.startX;
  cropState.offsetY = cropState.startOffsetY + event.clientY - cropState.startY;
  clampCrop();
  paintCrop();
});

cropFrame?.addEventListener("pointerup", () => {
  cropState.dragging = false;
});

cropZoom?.addEventListener("input", () => {
  if (!activeImage) return;

  const frameSize = cropFrame.clientWidth;
  const centerX = (frameSize / 2 - cropState.offsetX) / cropState.scale;
  const centerY = (frameSize / 2 - cropState.offsetY) / cropState.scale;
  cropState.scale = cropState.baseScale * Number(cropZoom.value);
  cropState.offsetX = frameSize / 2 - centerX * cropState.scale;
  cropState.offsetY = frameSize / 2 - centerY * cropState.scale;
  clampCrop();
  paintCrop();
});

cropSaveButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      setStatus(`${activeFile.name} 이미지를 업로드하는 중입니다...`);
      await uploadCroppedImage();
      closeCropper();
      processNextUpload();
    } catch (error) {
      setStatus(error.message || "이미지를 업로드하지 못했습니다.");
    }
  });
});

cropCancelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    uploadQueue = [];
    closeCropper();
    setStatus("업로드를 취소했습니다.");
  });
});

loadGallery();
