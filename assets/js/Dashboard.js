document.addEventListener("DOMContentLoaded", () => {
    if (!window.Auth.requireLogin()) return;

    const userNameEl = document.getElementById("userName");
    const userRoleEl = document.getElementById("userRole");
    const logoutBtn = document.getElementById("logoutBtn");

    if (userNameEl) {
        userNameEl.textContent = window.Auth.getFullName();
    }

    if (userRoleEl) {
        userRoleEl.textContent = window.Auth.getRole();
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            window.Auth.logout();
        });
    }
});