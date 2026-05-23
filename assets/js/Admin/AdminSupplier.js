// Admin suppliers page logic
// - Tải danh sách nhà cung cấp và hiển thị bảng
// - Lọc theo nhóm và tìm kiếm
// - Hiển thị thông tin, sửa, điều chỉnh số dư nhà cung cấp
async function loadSuppliersPage(showToastOnSuccess = true) {
    const container = document.getElementById("supplierTableContainer");
    const categorySelect = document.getElementById("supplierCategoryFilter");
    const totalCount = document.getElementById("supplierTotalCount");
    const activeCount = document.getElementById("supplierActiveCount");
    const totalDebt = document.getElementById("supplierTotalDebt");

    if (container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading suppliers...</div>';
    }

    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">All supplier groups</option>';
    }

    if (totalCount) totalCount.textContent = "0";
    if (activeCount) activeCount.textContent = "0";
    if (totalDebt) totalDebt.textContent = "0 ₫";

    try {
        const suppliersResponse = await apiFetch("/Supplier");

        if (!suppliersResponse.ok) {
            throw new Error("Unable to load supplier data.");
        }

        suppliersData = await suppliersResponse.json();
        renderSuppliersTable(suppliersData);
        populateSupplierCategoryFilter([]);
        updateSupplierSummary(suppliersData);

        if (showToastOnSuccess) {
            showToast("Loaded suppliers successfully.", "success");
        }
    } catch (error) {
        console.error("Load suppliers error:", error);

        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-truck"></i> Unable to load suppliers.</div>';
        }

        showToast("Unable to load supplier data.", "error");
    }
}

function populateSupplierCategoryFilter(categories) {
    const select = document.getElementById("supplierCategoryFilter");
    if (!select) return;

    select.innerHTML = `
        <option value="">All supplier groups</option>
        ${categories.map(cat => `
            <option value="${cat.categoryId ?? cat.id ?? ""}">
                ${cat.name ?? cat.categoryName ?? "Unknown"}
            </option>
        `).join("")}
    `;
}

function updateSupplierSummary(data) {
    const totalCount = document.getElementById("supplierTotalCount");
    const activeCount = document.getElementById("supplierActiveCount");
    const totalDebt = document.getElementById("supplierTotalDebt");

    if (totalCount) {
        totalCount.textContent = String(data.length);
    }

    if (activeCount) {
        activeCount.textContent = String(
            data.filter(item => String(item.status || "Active").toLowerCase() === "active").length
        );
    }

    const debtSum = data.reduce((sum, item) => {
        return sum + Number(item.balance || item.debt || 0);
    }, 0);

    if (totalDebt) {
        totalDebt.textContent = formatCurrency(debtSum);
    }
}

function renderSuppliersTable(data) {
    const container = document.getElementById("supplierTableContainer");
    if (!container) return;

    if (!data.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-truck"></i> No suppliers available.</div>';
        return;
    }

    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Supplier</th>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                    <tr>
                        <td>${item.supplierId ?? item.id ?? "-"}</td>
                        <td>${item.name ?? item.supplierName ?? "-"}</td>
                        <td>${item.contactName ?? "-"}</td>
                        <td>${item.phone ?? "-"}</td>
                        <td>
                            <div class="supplier-table-actions">
                                <button class="btn-sm btn-info" onclick='openSupplierInfoModal(${JSON.stringify(item)})'>Info</button>
                                <button class="btn-sm btn-success" onclick='openSupplierEditModal(${JSON.stringify(item)})'>Edit</button>
                                <button class="btn-sm btn-danger" onclick='deleteSupplier(${JSON.stringify(item)})'>Delete</button>
                                <button class="btn-sm btn-warning" onclick='openSupplierBalanceModal(${JSON.stringify(item)})'>Balance</button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function filterSuppliers() {
    const categoryId = document.getElementById("supplierCategoryFilter")?.value || "";
    const keyword = (document.getElementById("supplierSearchInput")?.value || "").toLowerCase().trim();

    let filtered = [...suppliersData];

    if (categoryId) {
        filtered = filtered.filter(item =>
            String(item.categoryId ?? item.categoryID ?? "") === String(categoryId)
        );
    }

    if (keyword) {
        filtered = filtered.filter(item => {
            const name = String(item.name ?? item.supplierName ?? "").toLowerCase();
            const contact = String(item.contactName ?? "").toLowerCase();
            const phone = String(item.phone ?? "").toLowerCase();
            return name.includes(keyword) || contact.includes(keyword) || phone.includes(keyword);
        });
    }

    renderSuppliersTable(filtered);
    updateSupplierSummary(filtered);
}

function resetSupplierFilters() {
    const categoryFilter = document.getElementById("supplierCategoryFilter");
    const searchInput = document.getElementById("supplierSearchInput");

    if (categoryFilter) categoryFilter.value = "";
    if (searchInput) searchInput.value = "";

    renderSuppliersTable(suppliersData);
    updateSupplierSummary(suppliersData);
}

function openSupplierInfoModal(item) {
    const title = document.getElementById("supplierInfoModalTitle");
    const body = document.getElementById("supplierInfoBody");

    if (title) {
        title.textContent = item.name ?? item.supplierName ?? "Supplier Info";
    }

    if (body) {
        body.innerHTML = `
            <div class="modal-field"><label>Name</label><p>${item.name ?? item.supplierName ?? "-"}</p></div>
            <div class="modal-field"><label>Contact</label><p>${item.contactName ?? "-"}</p></div>
            <div class="modal-field"><label>Phone</label><p>${item.phone ?? "-"}</p></div>
            <div class="modal-field"><label>Email</label><p>${item.email ?? "-"}</p></div>
            <div class="modal-field"><label>Address</label><p>${item.address ?? "-"}</p></div>
            <div class="modal-field"><label>Status</label><p>${item.status ?? "Active"}</p></div>
            <div class="modal-field"><label>Balance</label><p>${formatCurrency(item.balance ?? item.debt ?? 0)}</p></div>
        `;
    }

    openModal("supplierInfoModal");
}

function closeSupplierInfoModal() {
    closeModal("supplierInfoModal");
}

function openSupplierEditModal(item) {
    currentSupplierEditId = item.supplierId ?? item.id ?? null;

    setValue("supplierNameInput", item.name ?? item.supplierName ?? "");
    setValue("supplierContactInput", item.contactName ?? "");
    setValue("supplierPhoneInput", item.phone ?? "");
    setValue("supplierEmailInput", item.email ?? "");
    setValue("supplierAddressInput", item.address ?? "");
    const title = document.getElementById("supplierModalTitle");
    const submitBtn = document.getElementById("supplierModalSubmit");
    if (title) title.textContent = "Edit Supplier";
    if (submitBtn) submitBtn.textContent = "Update Supplier";

    openModal("supplierModal");
}

function closeSupplierModal() {
    closeModal("supplierModal");
    currentSupplierEditId = null;
}

function openSupplierModal(mode = "add") {
    if (mode === "add") {
        currentSupplierEditId = null;
        setValue("supplierNameInput", "");
        setValue("supplierContactInput", "");
        setValue("supplierPhoneInput", "");
        setValue("supplierEmailInput", "");
        setValue("supplierAddressInput", "");
        const title = document.getElementById("supplierModalTitle");
        const submitBtn = document.getElementById("supplierModalSubmit");
        if (title) title.textContent = "Add New Supplier";
        if (submitBtn) submitBtn.textContent = "Save Supplier";
    }
    openModal("supplierModal");
}

async function submitSupplierForm() {
    const payload = {
        name: document.getElementById("supplierNameInput")?.value.trim() || "",
        contactName: document.getElementById("supplierContactInput")?.value.trim() || "",
        phone: document.getElementById("supplierPhoneInput")?.value.trim() || "",
        email: document.getElementById("supplierEmailInput")?.value.trim() || "",
        address: document.getElementById("supplierAddressInput")?.value.trim() || ""
    };

    if (!payload.name || !payload.phone) {
        showToast("Vui lòng nhập tên nhà cung cấp và số điện thoại", "error");
        return;
    }

    try {
        const isEdit = !!currentSupplierEditId;
        if (isEdit && !currentSupplierEditId) {
            showToast("Không xác định được supplierId để cập nhật.", "error");
            return;
        }
        const path = isEdit ? `/Supplier/${currentSupplierEditId}` : "/Supplier";
        const method = isEdit ? "PUT" : "POST";

        const response = await apiFetch(path, {
            method,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await parseJsonSafe(response);
            throw new Error(errorData?.message || "Lưu nhà cung cấp thất bại");
        }

        showToast(isEdit ? "Cập nhật nhà cung cấp thành công" : "Thêm nhà cung cấp thành công", "success");
        closeSupplierModal();
        await loadSuppliersPage(false);
    } catch (error) {
        console.error("Save supplier error:", error);
        showToast(error.message || "Lưu nhà cung cấp thất bại", "error");
    }
}

const saveSupplier = submitSupplierForm;
window.openSupplierModal = openSupplierModal;
window.submitSupplierForm = submitSupplierForm;

function openSupplierBalanceModal(item) {
    supplierBalanceAdjustId = item.supplierId ?? null;

    const title = document.getElementById("supplierBalanceModalTitle");
    if (title) {
        title.textContent = `Adjust Balance - ${item.name ?? item.supplierName ?? "Supplier"}`;
    }

    setValue("supplierBalanceCurrent", formatCurrency(item.balance ?? item.debt ?? 0));
    setValue("supplierBalanceAmount", "");
    setValue("supplierBalanceNote", "");

    openModal("supplierBalanceModal");
}

function closeSupplierBalanceModal() {
    closeModal("supplierBalanceModal");
    supplierBalanceAdjustId = null;
}

async function saveSupplierBalanceAdjustment() {
    showToast("Backend không hỗ trợ điều chỉnh công nợ nhà cung cấp. Chức năng này đã bị vô hiệu hóa.", "warning");
    closeSupplierBalanceModal();
}

async function deleteSupplier(item) {
    const supplierId = item?.supplierId ?? item?.id;
    if (!supplierId) return showToast("Supplier ID không hợp lệ.", "error");
    if (!confirm(`Bạn có chắc muốn xóa nhà cung cấp #${supplierId}?`)) return;
    const response = await apiFetch(`/Supplier/${supplierId}`, { method: "DELETE" });
    if (!response.ok) {
        const errorData = await parseJsonSafe(response);
        const message = errorData?.errors
            ? Object.values(errorData.errors).flat().join(" | ")
            : (errorData?.message || "Xóa nhà cung cấp thất bại");
        showToast(message, "error");
        return;
    }
    showToast("Xóa nhà cung cấp thành công", "success");
    await loadSuppliersPage(false);
}
