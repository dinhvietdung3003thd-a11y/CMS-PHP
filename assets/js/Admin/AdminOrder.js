async function loadOrders(showToastOnSuccess = true) {
    const container = document.getElementById("ordersTableContainer");
    if (!container) return;

    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';

    try {
        const response = await apiFetch("/orders");
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
                                value="${order.id ?? order.orderId ?? ""}"
                                onchange="toggleOrderSelection(this)"
                            >
                        </td>
                        <td>${order.id ?? order.orderId ?? "-"}</td>
                        <td>${order.customerName ?? order.fullName ?? "-"}</td>
                        <td>${order.tableName ?? order.tableNumber ?? "-"}</td>
                        <td>${order.status ?? "-"}</td>
                        <td>${formatCurrency(order.totalAmount ?? order.total ?? 0)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-sm btn-info" onclick='viewOrder(${JSON.stringify(order)})'>View</button>
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
    alert(
        `Order ID: ${order.id ?? order.orderId ?? "-"}\n` +
        `Khách hàng: ${order.customerName ?? order.fullName ?? "-"}\n` +
        `Bàn: ${order.tableName ?? order.tableNumber ?? "-"}\n` +
        `Trạng thái: ${order.status ?? "-"}\n` +
        `Tổng tiền: ${formatCurrency(order.totalAmount ?? order.total ?? 0)}`
    );
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

    showToast("Chức năng xóa nhiều đơn đang để demo FE.", "success");
}

function openFilterModal() {
    showToast("Bạn có thể nối filter modal theo UI gốc ở bước sau.", "success");
}

function openSearchModal() {
    showToast("Bạn có thể nối search modal theo UI gốc ở bước sau.", "success");
}

function openCreateOrderModal() {
    showToast("Create order modal sẽ nối ở file inventory / orders nâng cao.", "success");
}

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