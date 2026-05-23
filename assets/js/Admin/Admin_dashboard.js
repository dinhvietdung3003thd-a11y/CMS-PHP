// Admin dashboard shared script
// - Cung cấp chức năng điều hướng các trang Admin
// - Quản lý trạng thái chung cho đơn hàng, kho, nhân sự, nhà cung cấp, công thức
// - Chứa các helper dùng chung như fetch API, toast, định dạng tiền tệ và ngày giờ

// Cấu hình URL API dùng chung cho mọi cuộc gọi fetch
const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

// Dữ liệu và trạng thái cho trang đơn hàng
let allOrders = [];
let allProducts = [];
let allCategories = [];
let currentTab = "active";
let selectedOrders = [];

// Dữ liệu và trạng thái cho quản lý kho
let allInventoryItems = [];
let inventoryData = [];
let inventoryTransactions = [];
let inventorySuppliers = [];
let suppliersData = [];
let supplierTransactions = [];
let currentSupplierEditId = null;
let supplierBalanceAdjustId = null;
let lowStockFilterActive = false;

// Dữ liệu cho công thức và nguyên liệu
let recipeProducts = [];
let currentRecipeProduct = null;
let currentRecipeRows = [];
let deletedRecipeIds = [];

// Dữ liệu cho chức năng tạo đơn hàng mới
let createOrderTables = [];
let createOrderProducts = [];
let createOrderItems = {};
let selectedCreateOrderTableId = null;

// Dữ liệu cho quản lý nhân sự
let employees = [];
let filteredEmployees = [];
let hrmCurrentMode = "add";
let hrmEditId = null;

// Người dùng hiện tại đang đăng nhập
window.currentUser = null;

// Khi DOM được tải xong, kiểm tra quyền quản trị và khởi tạo trang
window.addEventListener("DOMContentLoaded", () => {
    if (!window.Auth.requireAdmin()) return;

    loadUserProfile();
    bindGlobalEvents();
    showDashboard();
});

// Thiết lập sự kiện toàn cục cho trang quản trị
function bindGlobalEvents() {
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal")) {
            e.target.classList.remove("active");
        }
    });

    const avatarInput = document.getElementById("accountAvatarInput");
    if (avatarInput) {
        avatarInput.addEventListener("change", handleAccountAvatarChange);
    }

    const maintenanceToggle = document.getElementById("maintenanceModeToggle");
    if (maintenanceToggle) {
        maintenanceToggle.addEventListener("change", updateMaintenanceStatus);
    }
}

/* =========================
   COMMON HELPERS
========================= */

function getToken() {
    return window.Auth.getToken();
}

async function parseJsonSafe(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function showToast(message, type = "success") {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatCurrency(value) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("vi-VN")} ₫`;
}

function formatDateTime(dateValue) {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleString("vi-VN");
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("active");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
}

function logout() {
    window.Auth.logout();
}

function toggleSubmenu(element) {
    const submenu = element.querySelector(".submenu");
    const icon = element.querySelector(".icon");
    if (!submenu) return;

    if (submenu.style.display === "block") {
        submenu.style.display = "none";
        if (icon) icon.style.transform = "rotate(0deg)";
    } else {
        submenu.style.display = "block";
        if (icon) icon.style.transform = "rotate(90deg)";
    }
}

function showSection(sectionId) {
    document.querySelectorAll(".content-section").forEach(section => {
        section.classList.remove("active");
    });

    const target = document.getElementById(sectionId);
    if (target) target.classList.add("active");
}

async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: window.Auth.buildHeaders(options.headers || {})
    });

    if (response.status === 401 || response.status === 403) {
        showToast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
        setTimeout(() => window.Auth.logout(), 1200);
        throw new Error("Unauthorized");
    }

    return response;
}

function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/* =========================
   NAVIGATION
========================= */

async function showDashboard() {
    showSection("dashboardSection");
    await loadDashboardData();
}

function showOrdersPage() {
    showSection("ordersSection");
    loadOrders();
}

async function showSalesPage() {
    showSection("salesSection");

    if (!allOrders.length) {
        await loadOrders(false);
    }

    loadSales();
}

function showProductsPage() {
    showSection("productsSection");
    if (typeof loadProducts === "function") loadProducts();
}

function showCategoriesPage() {
    showSection("categoriesSection");
    if (typeof loadCategories === "function") loadCategories();
}

function showRecipesPage() {
    showSection("recipesSection");
    if (typeof loadRecipesPage === "function") loadRecipesPage();
}

function showInventoryPage() {
    showSection("inventorySection");
    if (typeof loadInventoryPage === "function") loadInventoryPage();
}

function showSuppliersPage() {
    showSection("suppliersSection");
    if (typeof loadSuppliersPage === "function") loadSuppliersPage();
}

function showHRMPage() {
    showSection("hrmSection");
    if (typeof loadHRMPage === "function") loadHRMPage();
}

function showSettingsPage() {
    showSection("settingsSection");
    if (typeof loadSettings === "function") loadSettings();
}

async function loadDashboardData() {
    try {

        const [
            ordersResponse,
            inventoryResponse,
            tablesResponse,
            productResponse
        ] = await Promise.all([
            apiFetch("/Orders"),
            apiFetch("/Inventory"),
            apiFetch("/Tables"),
            apiFetch("/Product")
        ]);

        if (
            !ordersResponse.ok ||
            !inventoryResponse.ok ||
            !tablesResponse.ok ||
            !productResponse.ok

        ) {
            throw new Error("Failed to load dashboard data");
        }

        const orders = await ordersResponse.json();
        const inventory = await inventoryResponse.json();
        const tables = await tablesResponse.json();
        const product = await productResponse.json();
        const detailedOrders = await Promise.all(
            orders.map(async (order) => {
                const response = await apiFetch(`/Orders/${order.id}`);
                if (!response.ok) return order;
                return await response.json();
            })
        );

        renderRecentOrders(orders);
        renderRevenueChart(orders);
        updateDashboardCards(orders, inventory, tables);
        renderCategoryChart(detailedOrders, product);

    } catch (error) {

        console.error("Dashboard load error:", error);

    }
}

function updateDashboardCards(orders, inventory, tables) {
    const today = new Date().toDateString();

    const todayOrders = orders.filter(order => {
        return new Date(order.orderDate).toDateString() === today;
    });

    const todayRevenue = todayOrders.reduce((sum, order) => {
        return sum + Number(order.totalAmount || 0);
    }, 0);

    const lowStockCount = inventory.filter(item => item.isLowStock === true).length;

    const occupiedTables = tables.filter(table => {
        return table.status?.toLowerCase() === "occupied";
    }).length;

    document.getElementById("dashKpiRevenue").textContent = formatCurrency(todayRevenue);
    document.getElementById("dashKpiOrders").textContent = orders.length;
    document.getElementById("dashKpiLowStock").textContent = lowStockCount;
    document.getElementById("dashKpiTables").textContent = occupiedTables;
}

function renderRecentOrders(orders) {

    const container = document.getElementById("recentOrdersContainer");

    if (!container) return;

    if (!orders.length) {

        container.innerHTML = `
            <div class="empty-state">
                Chưa có đơn hàng.
            </div>
        `;

        return;
    }

    const latestOrders = [...orders]
        .sort((a, b) => {
            return new Date(b.orderDate) - new Date(a.orderDate);
        })
        .slice(0, 5);

    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Mã</th>
                    <th>Ngày</th>
                    <th>Trạng thái</th>
                    <th>Tổng tiền</th>
                </tr>
            </thead>

            <tbody>
                ${latestOrders.map(order => `
                    <tr>
                        <td>#${order.id}</td>

                        <td>
                            ${new Date(order.orderDate).toLocaleString("vi-VN")}
                        </td>

                        <td>${order.status}</td>

                        <td>
                            ${(order.totalAmount || 0).toLocaleString("vi-VN")} đ
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

let revenueChartInstance = null;

function renderRevenueChart(orders) {
    const canvas = document.getElementById("revenueChart");
    if (!canvas || typeof Chart === "undefined") return;

    const labels = [];
    const values = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const label = date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit"
        });

        const dateKey = date.toDateString();

        const revenue = orders
            .filter(order => new Date(order.orderDate).toDateString() === dateKey)
            .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

        labels.push(label);
        values.push(revenue);
    }

    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }

    revenueChartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Doanh thu",
                data: values,
                tension: 0.35,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y.toLocaleString("vi-VN") + " đ";
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function (value) {
                            return value.toLocaleString("vi-VN") + " đ";
                        }
                    }
                }
            }
        }
    });
}

let categoryChartInstance = null;

function renderCategoryChart(orders, products) {

    const canvas = document.getElementById("categoriesChart");

    if (!canvas || typeof Chart === "undefined") return;

    const productCategoryMap = {};

    products.forEach(product => {
        productCategoryMap[product.productId] =
            product.categoryName || "Khác";
    });

    const revenueByCategory = {};

    orders.forEach(order => {

        if (!Array.isArray(order.details)) return;

        order.details.forEach(detail => {

            const category =
                productCategoryMap[detail.productId] || "Khác";

            revenueByCategory[category] =
                (revenueByCategory[category] || 0)
                + Number(detail.subtotal || 0);
        });
    });

    const labels = Object.keys(revenueByCategory);
    const values = Object.values(revenueByCategory);

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    categoryChartInstance = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels,
            datasets: [{
                data: values
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom"
                },

                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.label}: ${context.parsed.toLocaleString("vi-VN")} đ`;
                        }
                    }
                }
            }
        }
    });
}