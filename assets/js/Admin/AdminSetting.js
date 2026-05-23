// System settings page logic
// - Đọc và lưu dữ liệu cấu hình hệ thống từ localStorage
// - Hiển thị trạng thái maintenance và logo
// - Cho phép đồng bộ hoặc reset cài đặt demo
function loadSettings() {
    const stored = localStorage.getItem("systemSettings") || "{}";
    const settings = JSON.parse(stored);

    setValue("settingsStoreName", settings.storeName || "Aroma Cafe Hà Nội");
    setValue("settingsAddress", settings.address || "123 Phố Huế, Hai Bà Trưng, Hà Nội");
    setValue("settingsHotline", settings.hotline || "1900-XXXX");
    setValue("settingsEmail", settings.email || "contact@aroma.vn");
    setValue("settingsVATRate", settings.vatRate || "8");
    setValue("settingsServiceCharge", settings.serviceCharge || "0");
    setValue("settingsCurrency", settings.currency || "VND");

    const maintenanceToggle = document.getElementById("maintenanceModeToggle");
    if (maintenanceToggle) {
        maintenanceToggle.checked = settings.maintenanceMode || false;
    }

    updateMaintenanceStatus();

    const logoPreview = document.getElementById("settingsLogoPreview");
    if (logoPreview) {
        if (settings.logoUrl) {
            logoPreview.innerHTML = `<img src="${settings.logoUrl}" alt="Logo" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            logoPreview.innerHTML = `<span>☕</span>`;
        }
    }
}

function updateMaintenanceStatus() {
    const toggle = document.getElementById("maintenanceModeToggle");
    const statusEl = document.getElementById("maintenanceModeStatus");

    if (!toggle || !statusEl) return;

    statusEl.textContent = toggle.checked
        ? "Maintenance mode đang bật"
        : "Maintenance mode đang tắt";
}

function saveSettings() {
    const settings = {
        storeName: document.getElementById("settingsStoreName")?.value || "",
        address: document.getElementById("settingsAddress")?.value || "",
        hotline: document.getElementById("settingsHotline")?.value || "",
        email: document.getElementById("settingsEmail")?.value || "",
        vatRate: document.getElementById("settingsVATRate")?.value || "",
        serviceCharge: document.getElementById("settingsServiceCharge")?.value || "",
        currency: document.getElementById("settingsCurrency")?.value || "VND",
        maintenanceMode: document.getElementById("maintenanceModeToggle")?.checked || false,
        logoUrl: localStorage.getItem("systemLogoUrl") || ""
    };

    localStorage.setItem("systemSettings", JSON.stringify(settings));
    updateMaintenanceStatus();
    showToast("Đã lưu cài đặt hệ thống", "success");
}

function resetSettings() {
    localStorage.removeItem("systemSettings");
    localStorage.removeItem("systemLogoUrl");
    loadSettings();
    showToast("Đã reset cài đặt về mặc định", "success");
}

function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const result = e.target?.result;
        if (!result) return;

        localStorage.setItem("systemLogoUrl", result);

        const logoPreview = document.getElementById("settingsLogoPreview");
        if (logoPreview) {
            logoPreview.innerHTML = `<img src="${result}" alt="Logo" style="width:100%;height:100%;object-fit:cover;">`;
        }

        showToast("Đã cập nhật logo", "success");
    };
    reader.readAsDataURL(file);
}

function syncSystemSettings() {
    const statusBox = document.getElementById("settingsSyncStatus");
    if (statusBox) {
        statusBox.className = "sync-status loading";
        statusBox.textContent = "Đang đồng bộ cài đặt...";
    }

    setTimeout(() => {
        if (statusBox) {
            statusBox.className = "sync-status success";
            statusBox.textContent = "Đồng bộ thành công (demo FE).";
        }
        showToast("Đồng bộ cài đặt thành công", "success");
    }, 1000);
}