// Login page script
// - Chịu trách nhiệm xử lý lựa chọn vai trò admin/staff
// - Gửi yêu cầu đăng nhập lên API
// - Lưu token và thông tin người dùng vào localStorage
// - Chuyển hướng tới trang Admin hoặc Dashboard dựa trên vai trò
const BASE_URL = `${window.APP_CONFIG.API_BASE_URL}/Auth`;
console.log("API base URL:", BASE_URL);

const loginForm = document.getElementById("loginForm");
const errorBox = document.getElementById("errorMessage");
const btnText = document.getElementById("btnText");
const roleEmployee = document.getElementById("roleEmployee");
const roleAdmin = document.getElementById("roleAdmin");
const loginTypeInput = document.getElementById("loginType");

function setRole(role) {
    loginTypeInput.value = role;
    localStorage.setItem("selectedRole", role);

    if (role === "staff") {
        roleEmployee.classList.add("active");
        roleAdmin.classList.remove("active");
    } else {
        roleAdmin.classList.add("active");
        roleEmployee.classList.remove("active");
    }
}

roleEmployee?.addEventListener("click", () => setRole("staff"));
roleAdmin?.addEventListener("click", () => setRole("admin"));

const savedRole = localStorage.getItem("selectedRole") || "staff";
setRole(savedRole);

function showError(message) {
    errorBox.innerText = message;
    errorBox.classList.remove("hidden");
}

function hideError() {
    errorBox.innerText = "";
    errorBox.classList.add("hidden");
}

loginForm.onsubmit = async (e) => {
    e.preventDefault();

    hideError();
    btnText.innerText = "Đang xử lý...";

    const loginData = {
        username: document.getElementById("username").value.trim(),
        password: document.getElementById("password").value.trim()
    };

    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(loginData)
        });

        if (response.ok) {
            const result = await response.json();

            const role =
                result.role ||
                result.user?.Role ||
                result.user?.role ||
                result.User?.Role ||
                result.User?.role ||
                "Staff";

            const fullName =
                result.fullName ||
                result.user?.FullName ||
                result.user?.fullName ||
                result.User?.FullName ||
                result.User?.fullName ||
                "User";

            const normalized = { ...result, user: { userId: result.userId, fullName, role } };
            window.Auth.saveAuth(normalized);

            alert(`Đăng nhập thành công! Chào ${fullName} (Role: ${role})`);

            if (role === "Admin") {
                window.location.href = "./Admin_dashboard.html";
            } else {
                window.location.href = "./Dashboard.html";
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            showError(errorData.message || "Tài khoản hoặc mật khẩu không chính xác!");
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);

        let message = `Lỗi: Không thể kết nối tới Server. ${errorMessage}`;
        if (window.location.protocol === "file:") {
            message += " Vui lòng mở bằng Live Server, không dùng file://.";
        }

        showError(message);
    } finally {
        btnText.innerText = "SIGN IN";
    }
};
