// Admin categories page logic
// - Tải danh mục sản phẩm từ API
// - Hiển thị bảng danh mục và cập nhật dropdown sản phẩm
// - Tìm kiếm nhanh theo tên hoặc mô tả danh mục
async function loadCategories(showToastOnSuccess = true) {
    const container = document.getElementById("categoriesTableContainer");
    if (container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
    }

    try {
        const response = await apiFetch("/Categories");
        if (!response.ok) throw new Error("Không tải được danh mục.");

        const data = await response.json();
        allCategories = Array.isArray(data) ? data : (data.data || []);

        renderCategoriesTable(allCategories);
        populateCategorySelect();

        if (showToastOnSuccess) {
            showToast("Đã tải danh mục thành công", "success");
        }
    } catch (error) {
        console.error("Load categories error:", error);

        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i> Không thể tải danh mục.</div>';
        }

        showToast("Không thể tải danh mục", "error");
    }
}

function renderCategoriesTable(categories) {
    const container = document.getElementById("categoriesTableContainer");
    if (!container) return;

    if (!categories.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i> Không có danh mục nào.</div>';
        return;
    }

    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên danh mục</th>
                    <th>Mô tả</th>
                </tr>
            </thead>
            <tbody>
                ${categories.map(cat => `
                    <tr>
                        <td>${cat.categoryId ?? cat.id ?? "-"}</td>
                        <td>${cat.name ?? cat.categoryName ?? "-"}</td>
                        <td>${cat.description ?? "-"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    const totalCategoriesCount = document.getElementById("totalCategoriesCount");
    if (totalCategoriesCount) {
        totalCategoriesCount.textContent = String(categories.length);
    }
}

function populateCategorySelect() {
    const select = document.getElementById("productTypeInput");
    if (!select) return;

    select.innerHTML = `
        <option value="">Chọn loại sản phẩm</option>
        ${allCategories.map(cat => `
            <option value="${cat.categoryId ?? cat.id ?? ""}">
                ${cat.name ?? cat.categoryName ?? "Unknown"}
            </option>
        `).join("")}
    `;
}

function filterCategories() {
    const keyword = (document.getElementById("categoriesSearchInput")?.value || "")
        .toLowerCase()
        .trim();

    const filtered = allCategories.filter(cat => {
        const name = String(cat.name ?? cat.categoryName ?? "").toLowerCase();
        const desc = String(cat.description ?? "").toLowerCase();
        return name.includes(keyword) || desc.includes(keyword);
    });

    renderCategoriesTable(filtered);
}

function openCategoryModal() {
    showToast("Backend hiện chỉ hỗ trợ xem danh mục, chưa hỗ trợ thêm/sửa/xóa.", "warning");
}

function closeCategoryModal() {
    closeModal("categoryModal");
}

async function saveCategoryModal() {
    showToast("Backend hiện chỉ hỗ trợ xem danh mục, chưa hỗ trợ thêm/sửa/xóa.", "warning");
}
