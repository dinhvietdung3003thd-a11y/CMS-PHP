// Admin profile/account management logic
// - Hiển thị thông tin người dùng và avatar
// - Xử lý sửa thông tin tài khoản và thay đổi mật khẩu
// - Đọc dữ liệu user từ localStorage để dùng toàn cục
function loadUserProfile() {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
        window.location.href = "./Login.html";
        return;
    }

    const user = JSON.parse(userJson);
    const fullName = user.user?.fullName || user.user?.FullName || "User";
    const role = user.user?.role || user.user?.Role || "user";
    const username = user.user?.username || user.user?.Username || "Unknown";
    const email = user.user?.email || user.user?.Email || "";
    const phoneNumber = user.user?.phoneNumber || user.user?.PhoneNumber || "-";
    const avatarUrl = user.user?.avatar || user.user?.Avatar || null;

    const profileAvatar = document.getElementById("profileAvatar");
    if (profileAvatar) {
        if (avatarUrl) {
            profileAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
        } else {
            const avatar = fullName.charAt(0).toUpperCase();
            profileAvatar.textContent = avatar;
        }
    }

    const profileName = document.getElementById("profileName");
    const profileRole = document.getElementById("profileRole");

    if (profileName) profileName.textContent = fullName;
    if (profileRole) profileRole.textContent = role || "user";

    window.currentUser = {
        fullName,
        role,
        username,
        email,
        phoneNumber,
        avatar: avatarUrl
    };
}

function openAccountModal() {
    if (!window.currentUser) return;

    const {
        username,
        fullName,
        role,
        phoneNumber,
        email,
        avatar
    } = window.currentUser;

    setValue("accountUsername", username || "");
    setValue("accountFullName", fullName || "");
    setValue("accountRole", role || "");
    setValue("accountPhone", phoneNumber || "");
    setValue("accountEmail", email || "");

    const previewEl = document.getElementById("accountAvatarPreview");
    if (previewEl) {
        if (avatar) {
            previewEl.innerHTML = `<img src="${avatar}" alt="Avatar">`;
        } else {
            previewEl.textContent = (fullName || "U").charAt(0).toUpperCase();
        }
    }

    openModal("accountModal");
}

function closeAccountModal() {
    closeModal("accountModal");
}

function handleAccountAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById("accountAvatarPreview");
        if (preview) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Avatar">`;
        }
    };
    reader.readAsDataURL(file);
}

function clearFieldError(errorId) {
    const el = document.getElementById(errorId);
    if (el) {
        el.textContent = "";
        el.classList.remove("show");
    }
}

function showFieldError(errorId, message) {
    const el = document.getElementById(errorId);
    if (el) {
        el.textContent = message;
        el.classList.add("show");
    }
}

function clearAccountErrors() {
    [
        "accountFullNameError",
        "accountPhoneError",
        "accountEmailError",
        "accountCurrentPasswordError",
        "accountNewPasswordError",
        "accountConfirmPasswordError"
    ].forEach(clearFieldError);
}

async function saveAccountInfo() {
    showToast("Backend hiện chỉ hỗ trợ GET /Auth/me. Chức năng cập nhật hồ sơ đang tạm tắt.", "warning");
}

function updateProfileInfo() {
    return saveAccountInfo();
}

async function changePassword() {
    clearAccountErrors();

    const currentPassword = document.getElementById("accountCurrentPassword")?.value || "";
    const newPassword = document.getElementById("accountNewPassword")?.value || "";
    const confirmPassword = document.getElementById("accountConfirmPassword")?.value || "";

    let hasError = false;

    if (!currentPassword) {
        showFieldError("accountCurrentPasswordError", "Vui lòng nhập mật khẩu hiện tại");
        hasError = true;
    }

    if (!newPassword) {
        showFieldError("accountNewPasswordError", "Vui lòng nhập mật khẩu mới");
        hasError = true;
    }

    if (newPassword && newPassword.length < 6) {
        showFieldError("accountNewPasswordError", "Mật khẩu mới phải có ít nhất 6 ký tự");
        hasError = true;
    }

    if (newPassword !== confirmPassword) {
        showFieldError("accountConfirmPasswordError", "Mật khẩu xác nhận không khớp");
        hasError = true;
    }

    if (hasError) return;

    try {
        const response = await apiFetch(`/Auth/change-password`, {
            method: "POST",
            headers: Auth.buildHeaders(),
            body: JSON.stringify({
                CurrentPassword: currentPassword,
                NewPassword: newPassword,
                ConfirmPassword: confirmPassword
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            showToast(data.message || "Đổi mật khẩu thất bại", "error");
            return;
        }

        const newToken = data.token || data.Token;

        if (newToken) {
            localStorage.setItem("token", newToken);

            const userJson = localStorage.getItem("user");
            if (userJson) {
                const user = JSON.parse(userJson);
                user.token = newToken;
                user.Token = newToken;
                localStorage.setItem("user", JSON.stringify(user));
            }
        }

        document.getElementById("accountCurrentPassword").value = "";
        document.getElementById("accountNewPassword").value = "";
        document.getElementById("accountConfirmPassword").value = "";

        showToast(data.message || "Đổi mật khẩu thành công!", "success");
    } catch (error) {
        console.error("Change password error:", error);
        showToast("Không thể kết nối tới server", "error");
    }
}