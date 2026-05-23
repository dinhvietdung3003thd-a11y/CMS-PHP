// Authentication utility object
// - Quản lý token và dữ liệu người dùng trong localStorage
// - Kiểm tra yêu cầu đăng nhập và quyền Admin
// - Xây dựng header Authorization cho các API call
window.Auth = {
    getRawUser() {
        return localStorage.getItem("user");
    },

    getUser() {
        const raw = this.getRawUser();
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch (error) {
            console.error("Cannot parse user from localStorage:", error);
            return null;
        }
    },

    getToken() {
        return localStorage.getItem("token") || this.getUser()?.token || null;
    },

    getRole() {
        const user = this.getUser();
        return user?.role
            || user?.Role
            || user?.user?.Role
            || user?.user?.role
            || user?.User?.Role
            || user?.User?.role
            || "Staff";
    },

    getFullName() {
        const user = this.getUser();
        return user?.fullName
            || user?.FullName
            || user?.user?.FullName
            || user?.user?.fullName
            || user?.User?.FullName
            || user?.User?.fullName
            || "User";
    },

    getUsername() {
        const user = this.getUser();
        return user?.user?.Username
            || user?.user?.username
            || user?.User?.Username
            || user?.User?.username
            || "Unknown";
    },

    getPhoneNumber() {
        const user = this.getUser();
        return user?.user?.PhoneNumber
            || user?.user?.phoneNumber
            || user?.User?.PhoneNumber
            || user?.User?.phoneNumber
            || "-";
    },

    getEmail() {
        const user = this.getUser();
        return user?.user?.Email
            || user?.user?.email
            || user?.User?.Email
            || user?.User?.email
            || "";
    },

    getAvatar() {
        const user = this.getUser();
        return user?.user?.avatar
            || user?.user?.Avatar
            || user?.User?.avatar
            || user?.User?.Avatar
            || null;
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = "./Login.html";
            return false;
        }
        return true;
    },

    requireAdmin() {
        if (!this.requireLogin()) return false;

        if (this.getRole() !== "Admin") {
            alert("Bạn không có quyền truy cập trang Admin.");
            window.location.href = "./Dashboard.html";
            return false;
        }
        return true;
    },

    saveAuth(result) {
        if (result?.token) {
            localStorage.setItem("token", result.token);
        }
        localStorage.setItem("user", JSON.stringify(result));
    },

    logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedRole");
        window.location.href = "./Login.html";
    },

    buildHeaders(extra = {}) {
        const token = this.getToken();

        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...extra
        };
    }
};