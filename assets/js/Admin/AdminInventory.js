// Admin inventory page logic
// - Tải dữ liệu tồn kho và giao dịch kho từ API
// - Hiển thị bảng tồn kho và báo cáo trạng thái hàng tồn
// - Hỗ trợ lọc tồn kho thấp và trạng thái kho
async function loadInventoryPage(showToastOnSuccess = true) {
    const container = document.getElementById("inventoryTableContainer");
    const reportContainer = document.getElementById("inventoryReportContainer");

    if (container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu kho...</div>';
    }

    if (reportContainer) {
        reportContainer.innerHTML = "";
    }

    try {
        const [inventoryResponse, transactionResponse] = await Promise.all([
            apiFetch("/Inventory"),
            apiFetch("/InventoryTransaction")
        ]);

        if (!inventoryResponse.ok || !transactionResponse.ok) {
            throw new Error("Không thể tải dữ liệu kho.");
        }

        const inventoryResult = await inventoryResponse.json();
        const transactionResult = await transactionResponse.json();

        inventoryData = Array.isArray(inventoryResult) ? inventoryResult : (inventoryResult.data || []);
        inventoryTransactions = Array.isArray(transactionResult) ? transactionResult : (transactionResult.data || []);
        allInventoryItems = [...inventoryData];

        renderInventorySummary(inventoryData);
        renderInventoryTable(getFilteredInventoryData());

        if (showToastOnSuccess) {
            showToast("Đã tải dữ liệu kho thành công", "success");
        }
    } catch (error) {
        console.error("Load inventory error:", error);

        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-boxes-stacked"></i> Không thể tải dữ liệu kho.</div>';
        }

        showToast("Không thể tải dữ liệu kho", "error");
    }
}

function normalizeInventoryStatus(item) {
    const quantity = Number(item.quantityInStock ?? 0);
    const minStock = Number(item.minThreshold ?? 0);

    if (quantity <= 0) return "out";
    if (quantity <= minStock) return "low";
    return "in";
}

function getInventoryBadge(status) {
    if (status === "out") {
        return `<span class="badge out-of-stock">Out of stock</span>`;
    }
    if (status === "low") {
        return `<span class="badge low-stock">Low stock</span>`;
    }
    return `<span class="badge in-stock">In stock</span>`;
}

function renderInventorySummary(data) {
    const totalItemsEl = document.getElementById("inventoryTotalItems");
    const lowStockEl = document.getElementById("inventoryLowStockCount");
    const outOfStockEl = document.getElementById("inventoryOutOfStockCount");

    const totalItems = data.length;
    const lowStockCount = data.filter(item => normalizeInventoryStatus(item) === "low").length;
    const outOfStockCount = data.filter(item => normalizeInventoryStatus(item) === "out").length;

    if (totalItemsEl) totalItemsEl.textContent = String(totalItems);
    if (lowStockEl) lowStockEl.textContent = String(lowStockCount);
    if (outOfStockEl) outOfStockEl.textContent = String(outOfStockCount);
}

function getFilteredInventoryData() {
    if (!lowStockFilterActive) return [...inventoryData];

    return inventoryData.filter(item => {
        const status = normalizeInventoryStatus(item);
        return status === "low" || status === "out";
    });
}

function renderInventoryTable(data) {
    const container = document.getElementById("inventoryTableContainer");
    if (!container) return;

    if (!data.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-boxes-stacked"></i> Không có dữ liệu kho.</div>';
        return;
    }

    container.innerHTML = `
        <div class="inventory-table-wrap">
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nguyên liệu</th>
                        <th>Số lượng</th>
                        <th>Đơn vị</th>
                        <th>Tồn tối thiểu</th>
                        <th>Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => {
                        const id = item.inventoryId ?? "-";
                        const name = item.name ?? item.inventoryName ?? "-";
                        const quantity = Number(item.quantityInStock ?? 0);
                        const unit = item.unit ?? item.unitName ?? "-";
                        const minStock = Number(item.minThreshold ?? 0);
                        const status = normalizeInventoryStatus(item);

                        return `
                            <tr>
                                <td>${id}</td>
                                <td>${name}</td>
                                <td>${quantity}</td>
                                <td>${unit}</td>
                                <td>${minStock}</td>
                                <td>${getInventoryBadge(status)}</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function toggleLowStockFilter() {
    lowStockFilterActive = !lowStockFilterActive;

    const button = document.getElementById("lowStockFilterButton");
    if (button) {
        button.classList.toggle("pay-btn", lowStockFilterActive);
    }

    renderInventoryTable(getFilteredInventoryData());

    showToast(
        lowStockFilterActive
            ? "Đã bật bộ lọc low stock"
            : "Đã tắt bộ lọc low stock",
        "success"
    );
}

function loadInventoryReport() {
    const reportContainer = document.getElementById("inventoryReportContainer");
    if (!reportContainer) return;

    if (!inventoryData.length) {
        reportContainer.innerHTML = '<div class="empty-state">Chưa có dữ liệu để tạo báo cáo kho.</div>';
        return;
    }

    const totalItems = inventoryData.length;
    const lowStockItems = inventoryData.filter(item => normalizeInventoryStatus(item) === "low");
    const outOfStockItems = inventoryData.filter(item => normalizeInventoryStatus(item) === "out");

    reportContainer.innerHTML = `
        <div class="inventory-info-panel">
            <h3>Báo cáo kho hàng</h3>
            <p>Tổng mặt hàng: <strong>${totalItems}</strong></p>
            <p>Sắp hết: <strong>${lowStockItems.length}</strong></p>
            <p>Hết hàng: <strong>${outOfStockItems.length}</strong></p>

            <div class="section" style="margin-top:20px;">
                <h3>Danh sách cần chú ý</h3>
                ${
                    (lowStockItems.length || outOfStockItems.length)
                        ? `
                            <ul>
                                ${[...outOfStockItems, ...lowStockItems].map(item => `
                                    <li>
                                        ${item.name ?? item.inventoryName ?? "-"} -
                                        SL: ${item.quantityInStock ?? 0}
                                    </li>
                                `).join("")}
                            </ul>
                        `
                        : `<p>Không có mặt hàng nào cần chú ý.</p>`
                }
            </div>
        </div>
    `;
}

async function openInventoryTransactionModal(type) {
    const modal = document.getElementById("inventoryTransactionModal");
    const title = document.getElementById("inventoryTransactionModalTitle");
    const actionInput = document.getElementById("inventoryTransactionTypeInput");
    const amountInput = document.getElementById("inventoryTransactionQuantityInput");
    const noteInput = document.getElementById("inventoryTransactionNoteInput");
    const priceInput = document.getElementById("inventoryTransactionPriceInput");
    const select = document.getElementById("inventoryTransactionItemSelect") || modal?.querySelector("select");

    if (title) {
        title.textContent = type === "Import" ? "Stock In" : "Stock Out";
    }

    if (actionInput) {
        actionInput.value = type;
    }

    if (amountInput) amountInput.value = "";
    if (noteInput) noteInput.value = "";
    if (priceInput) priceInput.value = "";

    if (!select) {
        showToast("Không tìm thấy danh sách nguyên liệu.", "error");
        return;
    }

    try {
        const inventoryResponse = await apiFetch("/Inventory");

        if (!inventoryResponse.ok) {
            throw new Error("Không thể tải danh sách nguyên liệu.");
        }

        const inventoryResult = await inventoryResponse.json();
        const inventory = Array.isArray(inventoryResult) ? inventoryResult : (inventoryResult?.data || []);

        select.innerHTML = `
            <option value="">Chọn nguyên liệu</option>
            ${inventory.map(item => `
                <option value="${item.inventoryId ?? item.id ?? ""}">
                    ${item.name ?? item.inventoryName ?? "-"} (${item.unit || ""})
                </option>
            `).join("")}
        `;

        if (!inventory.length) {
            showToast("Chưa có nguyên liệu trong kho.", "warning");
        }

        openModal("inventoryTransactionModal");
    } catch (error) {
        console.error("Load inventory for modal error:", error);
        showToast(error.message || "Không thể tải danh sách nguyên liệu.", "error");
    }
}

function closeInventoryTransactionModal() {
    closeModal("inventoryTransactionModal");
}

async function saveInventoryTransaction() {
    const type = document.getElementById("inventoryTransactionTypeInput")?.value || "";
    const modal = document.getElementById("inventoryTransactionModal");
    const inventorySelect = document.getElementById("inventoryTransactionItemSelect") || modal?.querySelector("select");
    const itemId = inventorySelect?.value || "";
    const quantity = Number(document.getElementById("inventoryTransactionQuantityInput")?.value || 0);
    const price = Number(document.getElementById("inventoryTransactionPriceInput")?.value || 0);
    const note = document.getElementById("inventoryTransactionNoteInput")?.value.trim() || "";

    if (!itemId) {
        showToast("Vui lòng chọn nguyên liệu.", "error");
        return;
    }

    if (quantity <= 0) {
        showToast("Số lượng phải lớn hơn 0.", "error");
        return;
    }

    if (price < 0) {
        showToast("Giá phải lớn hơn hoặc bằng 0.", "error");
        return;
    }

    const transactionType = type === "Export" ? "Export" : "Import";

    const payload = {
        inventoryId: Number(itemId),
        transactionType,
        quantity: Number(quantity),
        price: Number(price || 0),
        note: note || ""
    };

    try {
        const response = await apiFetch("/InventoryTransaction", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await parseJsonSafe(response);
            throw new Error(errorData?.message || "Không thể lưu giao dịch kho");
        }

        closeInventoryTransactionModal();
        await loadInventoryPage(false);

        if (typeof loadInventoryReport === "function") {
            loadInventoryReport();
        }

        showToast(transactionType === "Import" ? "Stock in thành công" : "Stock out thành công", "success");
    } catch (error) {
        console.error("Save inventory transaction error:", error);
        showToast(error.message || "Không thể lưu giao dịch kho", "error");
    }
}

window.submitInventoryTransaction = saveInventoryTransaction;
window.openStockModal = openInventoryTransactionModal;

function openInventoryHistoryModal() {
    const body = document.getElementById("inventoryHistoryBody");
    if (!body) return;

    if (!inventoryTransactions.length) {
        body.innerHTML = `<div class="empty-state">Chưa có lịch sử giao dịch kho.</div>`;
        openModal("inventoryHistoryModal");
        return;
    }

    body.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Thời gian</th>
                    <th>ID nguyên liệu</th>
                    <th>Loại</th>
                    <th>Số lượng</th>
                    <th>Ghi chú</th>
                </tr>
            </thead>
            <tbody>
                ${inventoryTransactions.map(tx => `
                    <tr>
                        <td>${formatDateTime(tx.createdAt)}</td>
                        <td>${tx.inventoryId ?? "-"}</td>
                        <td>${tx.type ?? "-"}</td>
                        <td>${tx.quantity ?? 0}</td>
                        <td>${tx.note ?? "-"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    openModal("inventoryHistoryModal");
}

function closeInventoryHistoryModal() {
    closeModal("inventoryHistoryModal");
}
