// ========================================
// Admin Recipe Logic
// Uses existing state from Admin_dashboard.js
// ========================================

async function loadRecipesPage() {
    await Promise.all([
        loadRecipeCategories(),
        loadRecipeProducts()
    ]);

    const placeholder = document.getElementById("recipeDetailPlaceholder");
    const editor = document.getElementById("recipeEditorContainer");

    if (placeholder) placeholder.style.display = "grid";
    if (editor) {
        editor.style.display = "none";
        editor.innerHTML = "";
    }
}

async function loadRecipeCategories() {
    const categoryFilter = document.getElementById("recipeCategoryFilter");
    if (!categoryFilter) return;

    try {
        const response = await apiFetch("/Categories");

        if (!response.ok) {
            throw new Error("Cannot load categories");
        }

        const categories = await response.json();

        categoryFilter.innerHTML = `
            <option value="">Tất cả danh mục</option>
            ${categories.map(category => `
                <option value="${category.categoryId}">
                    ${category.name}
                </option>
            `).join("")}
        `;
    } catch (error) {
        console.error("Load recipe categories error:", error);
    }
}

async function loadRecipeProducts() {
    const container = document.getElementById("recipeProductListContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            Đang tải danh sách sản phẩm...
        </div>
    `;

    try {
        const response = await apiFetch("/Product");

        if (!response.ok) {
            throw new Error("Cannot load products");
        }

        recipeProducts = await response.json();
        renderRecipeProductList(recipeProducts);
    } catch (error) {
        console.error("Load recipe products error:", error);

        container.innerHTML = `
            <div class="loading">
                Không thể tải danh sách sản phẩm.
            </div>
        `;
    }
}

function renderRecipeProductList(products) {
    const container = document.getElementById("recipeProductListContainer");
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="loading">
                Không có sản phẩm nào.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="recipe-table">
            <tbody>
                ${products.map(product => {
        const productId = product.productId;
        const isSelected =
            currentRecipeProduct &&
            currentRecipeProduct.productId === productId;

        return `
                        <tr onclick="selectRecipeProduct(${productId})"
                            style="cursor:pointer; ${isSelected ? "background:#fff3f0;" : ""}">
                            <td>
                                <strong>${product.name || "Không có tên"}</strong>
                                <br>
                                <small>${product.categoryName || "Chưa có danh mục"}</small>
                            </td>
                            <td>${formatCurrency(product.price)}</td>
                        </tr>
                    `;
    }).join("")}
            </tbody>
        </table>
    `;
}

function filterRecipeProducts() {
    const searchInput = document.getElementById("recipeSearchInput");
    const categoryFilter = document.getElementById("recipeCategoryFilter");

    const keyword = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const categoryId = categoryFilter
        ? categoryFilter.value
        : "";

    const filtered = recipeProducts.filter(product => {
        const name = (product.name || "").toLowerCase();

        const matchName =
            !keyword || name.includes(keyword);

        const matchCategory =
            !categoryId ||
            String(product.categoryId) === String(categoryId);

        return matchName && matchCategory;
    });

    renderRecipeProductList(filtered);
}

async function selectRecipeProduct(productId) {
    currentRecipeProduct =
        recipeProducts.find(product => product.productId === productId);

    renderRecipeProductList(recipeProducts);

    const placeholder = document.getElementById("recipeDetailPlaceholder");
    const editor = document.getElementById("recipeEditorContainer");

    if (placeholder) placeholder.style.display = "none";

    if (editor) {
        editor.style.display = "block";
        editor.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                Đang tải công thức...
            </div>
        `;
    }

    await loadRecipeDetail(productId);
}

async function loadRecipeDetail(productId) {
    const editor = document.getElementById("recipeEditorContainer");
    if (!editor) return;

    try {
        const response = await apiFetch(`/Recipe`);

        if (!response.ok) {
            throw new Error("Cannot load recipe detail");
        }

        const rows = await response.json();
        const list = Array.isArray(rows) ? rows : (rows.data || []);
        currentRecipeRows = list.filter(row => String(row.productId) === String(productId));
        renderRecipeEditor();
    } catch (error) {
        console.error("Load recipe detail error:", error);

        currentRecipeRows = [];

        editor.innerHTML = `
            <div class="loading">
                Không thể tải công thức của sản phẩm này.
            </div>
        `;
    }
}

function renderRecipeEditor() {
    const editor = document.getElementById("recipeEditorContainer");
    if (!editor || !currentRecipeProduct) return;

    editor.innerHTML = `
        <div class="recipe-detail-header">
            <div>
                <h3>${currentRecipeProduct.name || "Sản phẩm"}</h3>
                <p>${currentRecipeProduct.categoryName || ""}</p>
            </div>
            <button class="primary-btn" onclick="addRecipeItem()">
                + Thêm nguyên liệu
            </button>
        </div>

        ${currentRecipeRows && currentRecipeRows.length > 0
            ? `
                    <table class="recipe-table">
                        <thead>
                            <tr>
                                <th>Nguyên liệu</th>
                                <th>Số lượng</th>
                                <th>Đơn vị</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${currentRecipeRows.map(row => `
                                <tr>
                                    <td>
                                        ${row.ingredientName ||
                                          row.inventoryName ||
                                          row.name ||
                                          `Nguyên liệu #${row.ingredientId}`
                                        }
                                    </td>
                                    <td>${row.quantityNeeded ?? "-"}</td>
                                    <td>${row.unit || row.unitName || "-"}</td>
                                    <td>
                                        <button onclick="editRecipeItem(${row.recipeId})">
                                            Sửa
                                        </button>

                                        <button class="danger-btn" onclick="deleteRecipeItem(${row.recipeId})">
                                            Xóa
                                            </button>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                `
            : `
                    <div class="recipe-detail-placeholder">
                        <div>
                            <i class="fas fa-utensils" style="font-size: 2rem;"></i>
                            <p>Sản phẩm này chưa có công thức.</p>
                        </div>
                    </div>
                `
        }
    `;
}

async function addRecipeItem() {
    if (!currentRecipeProduct) {
        showToast("Vui lòng chọn sản phẩm trước", "warning");
        return;
    }

    const inventoryId = prompt("Nhập inventoryId của nguyên liệu:");
    if (!inventoryId) return;

    const quantityNeeded = prompt("Nhập số lượng cần dùng:");
    if (!quantityNeeded) return;

    const payload = {
        productId: Number(currentRecipeProduct.productId),
        inventoryId: Number(inventoryId),
        quantityNeeded: Number(quantityNeeded)
    };
    if (!payload.productId || !payload.inventoryId || !payload.quantityNeeded) {
        showToast("Thiếu productId/inventoryId/quantityNeeded hợp lệ.", "warning");
        return;
    }

    try {
        const response = await apiFetch("/Recipe", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await parseJsonSafe(response);
            throw new Error(
                errorData?.errors
                    ? Object.values(errorData.errors).flat().join(" | ")
                    : (errorData?.message || "Create recipe failed")
            );
        }

        showToast("Thêm nguyên liệu thành công", "success");

        await loadRecipeDetail(currentRecipeProduct.productId);

    } catch (error) {
        console.error("Add recipe item error:", error);
        showToast("Thêm nguyên liệu thất bại", "error");
    }
}

async function deleteRecipeItem(recipeId) {
    const confirmed = confirm("Bạn có chắc muốn xóa nguyên liệu này khỏi công thức?");
    if (!confirmed) return;

    try {
        const response = await apiFetch(`/Recipe/${recipeId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Delete recipe failed");
        }

        showToast("Xóa nguyên liệu thành công", "success");

        if (currentRecipeProduct) {
            await loadRecipeDetail(currentRecipeProduct.productId);
        }

    } catch (error) {
        console.error("Delete recipe item error:", error);
        showToast("Xóa nguyên liệu thất bại", "error");
    }
}

async function editRecipeItem(recipeId) {
    recipeId = Number(recipeId);

    const currentRow = currentRecipeRows.find(
        row => Number(row.recipeId) === recipeId
    );

    if (!currentRow) {
        showToast("Không tìm thấy công thức cần sửa", "error");
        return;
    }

    const newQuantity = prompt(
        "Nhập số lượng mới:",
        currentRow.quantityNeeded
    );

    if (newQuantity === null) return;

    const quantityNeeded = Number(newQuantity);

    if (Number.isNaN(quantityNeeded) || quantityNeeded <= 0) {
        showToast("Số lượng không hợp lệ", "warning");
        return;
    }

    try {
        // Lấy lại recipe mới nhất từ BE để có productId và inventoryId đúng
        const detailResponse = await apiFetch(`/Recipe/${recipeId}`);

        if (!detailResponse.ok) {
            throw new Error("Cannot reload recipe detail");
        }

        const recipe = await detailResponse.json();

        const payload = {
            productId: Number(recipe.productId),
            inventoryId: Number(recipe.inventoryId),
            quantityNeeded: Number(quantityNeeded)
        };
        if (!payload.productId || !payload.inventoryId || !payload.quantityNeeded) {
            showToast("Thiếu productId/inventoryId/quantityNeeded hợp lệ.", "warning");
            return;
        }

        const response = await apiFetch(`/Recipe/${recipeId}`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await parseJsonSafe(response);
            throw new Error(
                errorData?.errors
                    ? Object.values(errorData.errors).flat().join(" | ")
                    : (errorData?.message || "Update recipe failed")
            );
        }

        showToast("Cập nhật công thức thành công", "success");

        if (currentRecipeProduct) {
            await loadRecipeDetail(currentRecipeProduct.productId);
        }

    } catch (error) {
        console.error("Edit recipe item error:", error);
        showToast("Cập nhật công thức thất bại", "error");
    }
}
