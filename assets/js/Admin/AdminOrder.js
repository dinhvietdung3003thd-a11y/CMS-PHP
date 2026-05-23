// Admin order management logic
// - Tải danh sách đơn hàng và hiển thị theo tab
// - Quản lý lựa chọn đơn hàng, xem chi tiết, xuất CSV
// - Cung cấp chế độ đơn hàng active/history/online
async function loadOrders(showToastOnSuccess = true) {
    const container = document.getElementById("ordersTableContainer");
    if (!container) return;

    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';

    try {
        const response = await apiFetch("/Orders");
        if (!response.ok) throw new Error("Không tải được danh sách đơn hàng.");

        const data = await response.json();
        allOrders = Array.isArray(data) ? data : (data.data || []);
        renderOrdersByTab();

        if (showToastOnSuccess) {
            showToast("Đã tải đơn hàng thành công", "success");
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> Không thể tải đơn hàng.</div>';
        showToast("Không thể tải đơn hàng", "error");
    }
}

function switchOrderTab(tab) {
    currentTab = tab;

    document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.querySelector(`.tab-button[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    renderOrdersByTab();
}

function renderOrdersByTab() {
    let filtered = [...allOrders];

    if (currentTab === "active") {
        filtered = filtered.filter(order => {
            const status = String(order.status || "").toLowerCase();
            return !status.includes("completed") && !status.includes("cancel");
        });
    } else if (currentTab === "history") {
        filtered = filtered.filter(order => {
            const status = String(order.status || "").toLowerCase();
            return status.includes("completed") || status.includes("cancel");
        });
    } else if (currentTab === "online") {
        filtered = filtered.filter(order =>
            order.orderType === "Online" ||
            order.type === "Online" ||
            order.isOnline === true
        );
    }

    renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
    const container = document.getElementById("ordersTableContainer");
    if (!container) return;

    if (!orders.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> Không có đơn hàng nào.</div>';
        return;
    }

    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th><input type="checkbox" onchange="toggleSelectAllOrders(this)"></th>
                    <th>ID</th>
                    <th>Khách hàng</th>
                    <th>Bàn</th>
                    <th>Trạng thái</th>
                    <th>Tổng tiền</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>
                            <input
                                type="checkbox"
                                value="${order.orderId ?? order.id ?? ""}"
                                onchange="toggleOrderSelection(this)"
                            >
                        </td>
                        <td>${order.orderId ?? order.id ?? "-"}</td>
                        <td>${order.customerName ?? order.fullName ?? "-"}</td>
                        <td>${order.tableName ?? order.tableNumber ?? "-"}</td>
                        <td>${order.status ?? "-"}</td>
                        <td>${formatCurrency(order.totalAmount ?? order.total ?? 0)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-sm btn-info" onclick='viewOrder(${JSON.stringify(order)})'>View</button>
                                <button class="btn-sm btn-success" onclick='editOrder(${JSON.stringify(order)})'>Edit</button>
                                <button class="btn-sm btn-warning" onclick='updateOrderStatusPrompt(${JSON.stringify(order)})'>Status</button>
                                <button class="btn-sm btn-danger" onclick='deleteSingleOrder(${JSON.stringify(order)})'>Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function toggleOrderSelection(checkbox) {
    const id = checkbox.value;
    if (checkbox.checked) {
        if (!selectedOrders.includes(id)) selectedOrders.push(id);
    } else {
        selectedOrders = selectedOrders.filter(item => item !== id);
    }
}

function toggleSelectAllOrders(source) {
    const checkboxes = document.querySelectorAll("#ordersTableContainer tbody input[type='checkbox']");
    if (!source.checked) {
        selectedOrders = [];
    }

    checkboxes.forEach(cb => {
        cb.checked = source.checked;
        const id = cb.value;

        if (source.checked) {
            if (!selectedOrders.includes(id)) selectedOrders.push(id);
        }
    });
}

function viewOrder(order) {
    const orderId = order.orderId ?? order.id;
    if (!orderId) {
        showToast("Không tìm thấy mã đơn hàng hợp lệ.", "error");
        return;
    }
    window.openOrderDetails(orderId);
}

window.openOrderDetails = async function (orderId) {
    if (!orderId) return showToast("Order ID không hợp lệ", "error");
    const response = await apiFetch(`/Orders/${orderId}`);
    if (!response.ok) return showToast("Không tải được chi tiết đơn hàng", "error");
    const order = await response.json();
    alert(
        `Order ID: ${order.orderId ?? "-"}\n` +
        `Khách hàng: ${order.customerName ?? "-"}\n` +
        `Bàn: ${order.tableName ?? "-"}\n` +
        `Trạng thái: ${order.status ?? "-"}\n` +
        `Tổng tiền: ${formatCurrency(order.totalAmount ?? 0)}`
    );
};

async function editOrder(order) {
    const orderId = order.orderId ?? order.id;
    if (!orderId) return showToast("Order ID không hợp lệ", "error");
    const response = await apiFetch(`/Orders/${orderId}`);
    if (!response.ok) return showToast("Không tải được đơn hàng để sửa", "error");
    const current = await response.json();
    const note = prompt("Nhập ghi chú đơn hàng:", current.note ?? "");
    if (note === null) return;
    const details = Array.isArray(current.details) ? current.details.map(d => ({
        productId: Number(d.productId),
        quantity: Number(d.quantity)
    })).filter(d => d.productId && d.quantity > 0) : [];
    if (!details.length) return showToast("Đơn hàng chưa có details hợp lệ để cập nhật.", "warning");
    const payload = {
        customerId: Number(current.customerId),
        tableId: current.tableId ?? null,
        note: String(note || ""),
        details
    };
    const updateRes = await apiFetch(`/Orders/${orderId}`, { method: "PUT", body: JSON.stringify(payload) });
    if (!updateRes.ok) return showToast("Cập nhật đơn hàng thất bại", "error");
    showToast("Cập nhật đơn hàng thành công", "success");
    await loadOrders(false);
}

async function updateOrderStatusPrompt(order) {
    const orderId = order.orderId ?? order.id;
    if (!orderId) return showToast("Order ID không hợp lệ", "error");
    const status = prompt("Nhập trạng thái mới (Pending/Completed/Cancelled):", order.status ?? "Pending");
    if (status === null) return;
    if (!status.trim()) return showToast("Vui lòng nhập trạng thái", "warning");
    const response = await apiFetch(`/Orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: status.trim() })
    });
    if (!response.ok) return showToast("Cập nhật trạng thái thất bại", "error");
    showToast("Cập nhật trạng thái thành công", "success");
    await loadOrders(false);
}

async function deleteSingleOrder(order) {
    const orderId = order.orderId ?? order.id;
    if (!orderId) return showToast("Order ID không hợp lệ", "error");
    if (!confirm(`Bạn có chắc muốn xóa đơn #${orderId}?`)) return;
    const response = await apiFetch(`/Orders/${orderId}`, { method: "DELETE" });
    if (!response.ok) return showToast("Xóa đơn hàng thất bại", "error");
    showToast("Xóa đơn hàng thành công", "success");
    await loadOrders(false);
}

function exportToCSV() {
    if (!allOrders.length) {
        showToast("Không có đơn hàng để xuất CSV", "error");
        return;
    }

    const rows = allOrders.map(order => [
        order.id ?? order.orderId ?? "",
        order.customerName ?? order.fullName ?? "",
        order.tableName ?? order.tableNumber ?? "",
        order.status ?? "",
        order.totalAmount ?? order.total ?? 0
    ].join(","));

    const csv = ["OrderId,Customer,Table,Status,Total", ...rows].join("\n");
    downloadCSV(csv, "orders.csv");
    showToast("Đã xuất file orders.csv", "success");
}

async function deleteSelectedOrders() {
    if (!selectedOrders.length) {
        showToast("Vui lòng chọn ít nhất 1 đơn hàng", "error");
        return;
    }

        const confirmed = confirm(`Bạn có chắc muốn xóa ${selectedOrders.length} đơn hàng đã chọn?`);
    if (!confirmed) return;
    try {
        for (const id of selectedOrders) {
            if (!id) continue;
            const response = await apiFetch(`/Orders/${id}`, { method: "DELETE" });
            if (!response.ok) {
                const errorData = await parseJsonSafe(response);
                throw new Error(errorData?.message || `Xóa đơn hàng ${id} thất bại`);
            }
        }
        selectedOrders = [];
        await loadOrders(false);
        showToast("Đã xóa các đơn hàng đã chọn", "success");
    } catch (error) {
        console.error("Delete selected orders error:", error);
        showToast(error.message || "Không thể xóa đơn hàng", "error");
    }
}

function openFilterModal() {
    showToast("Bạn có thể nối filter modal theo UI gốc ở bước sau.", "success");
}

function openSearchModal() {
    showToast("Bạn có thể nối search modal theo UI gốc ở bước sau.", "success");
}

function closeCreateOrderModal() {
    closeModal("createOrderModal");
}

let createOrderProducts = [];
let createOrderCart = [];
let createOrderTables = [];
let selectedCreateOrderTableId = null;

function normalizeApiCollection(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
}

function renderCreateOrderProducts() {
    const container = document.getElementById("createOrderProductsList");
    if (!container) return;

    if (!createOrderProducts.length) {
        container.innerHTML = '<div class="empty-state">Chưa có sản phẩm khả dụng.</div>';
        return;
    }

    container.innerHTML = createOrderProducts.map((product) => {
        const productId = product.productId ?? product.id;
        if (!productId) return "";
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div>
                    <div>${product.name ?? "Sản phẩm"}</div>
                    <small>${formatCurrency(Number(product.price || 0))}</small>
                </div>
                <button class="btn-sm btn-success" type="button" onclick="addProductToOrderCart(${Number(productId)})">Thêm</button>
            </div>
        `;
    }).join("");
}

function renderCreateOrderCart() {
    const cartContainer = document.getElementById("createOrderCart");
    const totalElement = document.getElementById("createOrderTotal");
    if (!cartContainer || !totalElement) return;

    if (!createOrderCart.length) {
        cartContainer.innerHTML = '<div class="empty-state">Chưa có món trong giỏ hàng.</div>';
        totalElement.textContent = formatCurrency(0);
        return;
    }

    cartContainer.innerHTML = createOrderCart.map((item) => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
            <div>
                <div>${item.name}</div>
                <small>${item.quantity} × ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.quantity)}</small>
            </div>
            <button class="btn-sm btn-danger" type="button" onclick="removeProductFromOrderCart(${Number(item.productId)})">Xóa</button>
        </div>
    `).join("");

    const total = createOrderCart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
    totalElement.textContent = formatCurrency(total);
}

async function loadCreateOrderProducts() {
    const response = await apiFetch("/Product");
    if (!response.ok) throw response;
    const data = await response.json();
    const normalized = normalizeApiCollection(data);
    createOrderProducts = normalized.filter(product => (product?.isAvailable !== false) && (product?.productId ?? product?.id));
    renderCreateOrderProducts();
}

async function loadCreateOrderTables() {
    const tableSelect = document.getElementById("createOrderTableSelect");
    if (!tableSelect) return;

    try {
        const response = await apiFetch("/Tables");
        if (!response.ok) throw new Error("Không tải được danh sách bàn.");
        const data = await response.json();
        createOrderTables = normalizeApiCollection(data);
        const availableTables = createOrderTables.filter(table => {
            const status = String(table?.status || "").toLowerCase();
            return table?.isAvailable === true || status.includes("available") || status.includes("trống");
        });

        tableSelect.innerHTML = `<option value="">Không chọn bàn</option>${availableTables.map(table => {
            const tableId = table.tableId ?? table.id;
            const tableName = table.tableName ?? table.name ?? `Bàn ${tableId}`;
            if (!tableId) return "";
            return `<option value="${Number(tableId)}">${tableName}</option>`;
        }).join("")}`;
    } catch (error) {
        console.error("Load tables error:", error);
        tableSelect.innerHTML = '<option value="">Không chọn bàn</option>';
    }
}

function handleCreateOrderTableChange(value) {
    selectedCreateOrderTableId = value && String(value).trim() ? Number(value) : null;
}

function addProductToOrderCart(productId) {
    const normalizedProductId = Number(productId);
    if (!normalizedProductId) return;
    const product = createOrderProducts.find(item => Number(item.productId ?? item.id) === normalizedProductId);
    if (!product) return;

    const existed = createOrderCart.find(item => Number(item.productId) === normalizedProductId);
    if (existed) {
        existed.quantity += 1;
    } else {
        createOrderCart.push({
            productId: normalizedProductId,
            name: product.name ?? "Sản phẩm",
            price: Number(product.price || 0),
            quantity: 1
        });
    }
    renderCreateOrderCart();
}

function removeProductFromOrderCart(productId) {
    const normalizedProductId = Number(productId);
    createOrderCart = createOrderCart.filter(item => Number(item.productId) !== normalizedProductId);
    renderCreateOrderCart();
}

async function submitCreateOrder() {
    if (!createOrderCart.length) {
        showToast("Vui lòng thêm sản phẩm vào giỏ hàng.", "error");
        return;
    }
    const hasInvalidItem = createOrderCart.some(item => !item.productId || Number(item.quantity) <= 0);
    if (hasInvalidItem) {
        showToast("Giỏ hàng có sản phẩm không hợp lệ.", "error");
        return;
    }

    const payload = {
        customerId: null,
        tableId: selectedCreateOrderTableId ? Number(selectedCreateOrderTableId) : null,
        note: "",
        details: createOrderCart.map(item => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity)
        }))
    };

    try {
        const response = await apiFetch("/Orders", { method: "POST", body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorData = await parseJsonSafe(response);
            let message = errorData?.errors
                ? Object.values(errorData.errors).flat().join(" | ")
                : (errorData?.message || "Tạo đơn hàng thất bại");
            if ((response.status === 401 || response.status === 403) && !errorData?.errors) {
                message = "Bạn không có quyền tạo đơn hàng.";
            }
            if (response.status === 422 && !message) {
                message = "Dữ liệu tạo đơn chưa hợp lệ.";
            }
            throw new Error(message);
        }

        showToast("Tạo đơn hàng thành công", "success");
        closeCreateOrderModal();
        await loadOrders(false);
    } catch (error) {
        console.error("Create order error:", error);
        showToast(error.message || "Không thể tạo đơn hàng", "error");
    }
}

function openCreateOrderModal() {
    openModal("createOrderModal");
    createOrderCart = [];
    selectedCreateOrderTableId = null;
    const tableSelect = document.getElementById("createOrderTableSelect");
    if (tableSelect) tableSelect.value = "";
    renderCreateOrderCart();
    loadCreateOrderTables();
    loadCreateOrderProducts().catch(async (errorResponse) => {
        let message = "Không tải được thực đơn.";
        if (errorResponse?.status === 401 || errorResponse?.status === 403) {
            message = "Bạn không có quyền truy cập thực đơn.";
        }
        showToast(message, "error");
        createOrderProducts = [];
        renderCreateOrderProducts();
    });
}

window.closeCreateOrderModal = closeCreateOrderModal;
window.submitCreateOrder = submitCreateOrder;
window.openCreateOrderModal = openCreateOrderModal;
window.addProductToOrderCart = addProductToOrderCart;
window.loadOrders = loadOrders;
window.openSearchModal = openSearchModal;
window.removeProductFromOrderCart = removeProductFromOrderCart;
window.handleCreateOrderTableChange = handleCreateOrderTableChange;

function loadSales() {
    const container = document.getElementById("salesTableContainer");
    if (!container) return;

    if (!allOrders.length) {
        container.innerHTML = '<div class="empty-state">Chưa có dữ liệu doanh thu.</div>';
        return;
    }

    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>ID đơn</th>
                    <th>Khách hàng</th>
                    <th>Ngày</th>
                    <th>Doanh thu</th>
                </tr>
            </thead>
            <tbody>
                ${allOrders.map(order => `
                    <tr>
                        <td>${order.id ?? order.orderId ?? "-"}</td>
                        <td>${order.customerName ?? order.fullName ?? "-"}</td>
                        <td>${formatDateTime(order.createdAt ?? order.orderDate ?? "")}</td>
                        <td>${formatCurrency(order.totalAmount ?? order.total ?? 0)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function exportSalesToCSV() {
    if (!allOrders.length) {
        showToast("Không có dữ liệu sales để xuất", "error");
        return;
    }

    const rows = allOrders.map(order => [
        order.id ?? order.orderId ?? "",
        order.customerName ?? order.fullName ?? "",
        formatDateTime(order.createdAt ?? order.orderDate ?? ""),
        order.totalAmount ?? order.total ?? 0
    ].join(","));

    const csv = ["OrderId,Customer,Date,Revenue", ...rows].join("\n");
    downloadCSV(csv, "sales.csv");
    showToast("Đã xuất file sales.csv", "success");
}
