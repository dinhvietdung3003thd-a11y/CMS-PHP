// Admin product management logic
// - Tải danh sách sản phẩm và hiển thị bảng
// - Thêm, xóa, và làm mới dữ liệu sản phẩm
// - Áp dụng định dạng tiền tệ và lấy tên danh mục
async function loadProducts(showToastOnSuccess = true) {
    const container = document.getElementById("productTableContainer");
    if (!container) return;

    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';

    try {
        const response = await apiFetch("/Product");
        if (!response.ok) throw new Error("Không tải được sản phẩm.");

        const data = await response.json();
        allProducts = Array.isArray(data) ? data : (data.data || []);

        renderProductsTable(allProducts);

        const totalProductsCount = document.getElementById("totalProductsCount");
        if (totalProductsCount) {
            totalProductsCount.textContent = String(allProducts.length);
        }

        if (showToastOnSuccess) {
            showToast("Đã tải sản phẩm thành công", "success");
        }
    } catch (error) {
        console.error("Load products error:", error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i> Không thể tải sản phẩm.</div>';
        showToast("Không thể tải sản phẩm", "error");
    }
}

function getCategoryNameById(categoryId) {
    const found = allCategories.find(cat =>
        String(cat.categoryId ?? cat.id) === String(categoryId)
    );

    return found ? (found.name ?? found.categoryName ?? "-") : "-";
}

function renderProductsTable(products) {
    const container = document.getElementById("productTableContainer");
    if (!container) return;

    if (!products.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i> Chưa có sản phẩm nào.</div>';
        return;
    }

    container.innerHTML = `
        <table class="product-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(item => `
                    <tr>
                        <td>${item.id ?? item.productId ?? "-"}</td>
                        <td>${item.name ?? item.productName ?? "-"}</td>
                        <td>${getCategoryNameById(item.categoryId ?? item.categoryID ?? "")}</td>
                        <td>${formatCurrency(item.price ?? 0)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

async function addProduct() {
    const productId = document.getElementById("productIdInput")?.value.trim() || "";
    const productName = document.getElementById("productNameInput")?.value.trim() || "";
    const productPrice = document.getElementById("productPriceInput")?.value || "";
    const categoryId = document.getElementById("productTypeInput")?.value || "";

    if (!productName || !productPrice || !categoryId) {
        showToast("Vui lòng nhập đầy đủ thông tin sản phẩm", "error");
        return;
    }

    const payload = {
        productId: productId || undefined,
        name: productName,
        price: Number(productPrice),
        categoryId: Number(categoryId)
    };

    try {
        const response = await apiFetch("/Product", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await parseJsonSafe(response);
            throw new Error(errorData?.message || "Thêm sản phẩm thất bại");
        }

        showToast("Thêm sản phẩm thành công", "success");
        clearProductForm();
        await loadProducts(false);
    } catch (error) {
        console.error("Add product error:", error);
        showToast(error.message || "Thêm sản phẩm thất bại", "error");
    }
}

function clearProductForm() {
    const ids = [
        "productIdInput",
        "productNameInput",
        "productPriceInput",
        "productTypeInput",
        "deleteProductIdInput"
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

async function deleteProduct() {
    const productId = document.getElementById("deleteProductIdInput")?.value.trim() || "";

    if (!productId) {
        showToast("Vui lòng nhập Product ID để xóa", "error");
        return;
    }

    const confirmed = confirm("Bạn có chắc muốn xóa sản phẩm này không?");
    if (!confirmed) return;

    try {
        const response = await apiFetch(`/Product/${productId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const errorData = await parseJsonSafe(response);
            throw new Error(errorData?.message || "Xóa sản phẩm thất bại");
        }

        showToast("Xóa sản phẩm thành công", "success");
        await loadProducts(false);
        document.getElementById("deleteProductIdInput").value = "";
    } catch (error) {
        console.error("Delete product error:", error);
        showToast(error.message || "Xóa sản phẩm thất bại", "error");
    }
}