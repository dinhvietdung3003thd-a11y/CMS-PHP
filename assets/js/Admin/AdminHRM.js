// Admin HRM page logic
// - Quản lý danh sách nhân sự bằng localStorage
// - Lọc nhân viên theo vai trò và tìm kiếm
// - Thêm, sửa và thay đổi trạng thái nhân viên
function getStoredHRMData() {
    const raw = localStorage.getItem("hrmEmployees");
    if (!raw) return [];

    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function persistHRMData() {
    localStorage.setItem("hrmEmployees", JSON.stringify(employees));
}

function loadHRMPage() {
    employees = getStoredHRMData();

    if (!employees.length) {
        employees = [
            {
                id: 1,
                fullName: "Đinh Việt Dũng",
                role: "Admin",
                phone: "0987654321",
                email: "dinhdung@aroma.com",
                status: "Active",
                isActive: true,
                baseSalary: "12000000"
            },
            {
                id: 2,
                fullName: "Nguyễn Xuân Đạt",
                role: "Cashier",
                phone: "0123456789",
                email: "xdat@aroma.com",
                status: "Active",
                isActive: true,
                baseSalary: "8500000"
            }
        ];
        persistHRMData();
    }

    applyHRMFilters();
}

function applyHRMFilters() {
    const roleFilter = document.getElementById("hrmRoleFilter")?.value || "All";
    const keyword = (document.getElementById("hrmSearchInput")?.value || "")
        .toLowerCase()
        .trim();

    filteredEmployees = employees.filter(emp => {
        const roleMatch = roleFilter === "All" || emp.role === roleFilter;
        const keywordMatch =
            emp.fullName.toLowerCase().includes(keyword) ||
            emp.phone.toLowerCase().includes(keyword) ||
            (emp.email || "").toLowerCase().includes(keyword);

        return roleMatch && keywordMatch;
    });

    renderHRMTable();
    updateHRMSummary();
}

function updateHRMSummary() {
    const totalEl = document.getElementById("hrmTotalCount");
    const activeEl = document.getElementById("hrmActiveCount");

    if (totalEl) totalEl.textContent = String(employees.length);
    if (activeEl) {
        activeEl.textContent = String(employees.filter(emp => emp.isActive).length);
    }
}

function renderHRMTable() {
    const body = document.getElementById("hrmTableBody");
    if (!body) return;

    if (!filteredEmployees.length) {
        body.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">Không có nhân viên phù hợp</td>
            </tr>
        `;
        return;
    }

    body.innerHTML = filteredEmployees.map(emp => `
        <tr>
            <td>${emp.fullName}</td>
            <td><span class="role-chip">${emp.role}</span></td>
            <td>${emp.phone}</td>
            <td>${emp.email || "-"}</td>
            <td>${emp.status}</td>
            <td>
                <div class="employee-actions">
                    <button class="btn-sm btn-info" onclick="openEmployeeModal('edit', ${emp.id})">Edit</button>
                    <button class="btn-sm btn-success" onclick="toggleEmployeeStatus(${emp.id})">
                        ${emp.isActive ? "Deactivate" : "Activate"}
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

function openEmployeeModal(mode = "add", id = null) {
    hrmCurrentMode = mode;
    hrmEditId = id;

    const titleEl = document.getElementById("employeeModalTitle");
    if (titleEl) {
        titleEl.textContent = mode === "add" ? "Add Employee" : "Edit Employee";
    }

    const form = document.getElementById("employeeForm");
    if (form) form.reset();

    if (mode === "edit") {
        const employee = employees.find(emp => emp.id === id);
        if (employee) {
            setValue("employeeFullNameInput", employee.fullName);
            setValue("employeePhoneInput", employee.phone);
            setValue("employeeEmailInput", employee.email || "");
            setValue("employeeRoleInput", employee.role);
            setValue("employeeBaseSalaryInput", employee.baseSalary || "");
            setValue("employeeStatusInput", employee.status);
        }
    }

    openModal("employeeModal");
}

function closeEmployeeModal() {
    closeModal("employeeModal");
}

function submitEmployeeForm() {
    const fullName = document.getElementById("employeeFullNameInput")?.value.trim() || "";
    const phone = document.getElementById("employeePhoneInput")?.value.trim() || "";
    const email = document.getElementById("employeeEmailInput")?.value.trim() || "";
    const role = document.getElementById("employeeRoleInput")?.value || "Cashier";
    const baseSalary = document.getElementById("employeeBaseSalaryInput")?.value || "";
    const status = document.getElementById("employeeStatusInput")?.value || "Active";

    if (!fullName || !phone) {
        showToast("Vui lòng nhập đầy đủ tên và số điện thoại", "error");
        return;
    }

    if (hrmCurrentMode === "add") {
        const newEmployee = {
            id: Date.now(),
            fullName,
            phone,
            email,
            role,
            baseSalary,
            status,
            isActive: status === "Active"
        };

        employees.push(newEmployee);
        showToast("Thêm nhân viên thành công", "success");
    } else {
        const employee = employees.find(emp => emp.id === hrmEditId);
        if (employee) {
            employee.fullName = fullName;
            employee.phone = phone;
            employee.email = email;
            employee.role = role;
            employee.baseSalary = baseSalary;
            employee.status = status;
            employee.isActive = status === "Active";
            showToast("Cập nhật nhân viên thành công", "success");
        }
    }

    persistHRMData();
    applyHRMFilters();
    closeEmployeeModal();
}

function toggleEmployeeStatus(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) {
        showToast("Không tìm thấy nhân viên", "error");
        return;
    }

    employee.isActive = !employee.isActive;
    employee.status = employee.isActive ? "Active" : "Inactive";

    persistHRMData();
    renderHRMTable();
    updateHRMSummary();

    showToast(
        `Employee ${employee.isActive ? "activated" : "deactivated"} successfully.`,
        "success"
    );
}

function exportTimesheet() {
    const rows = employees.map(emp =>
        [
            emp.fullName,
            emp.role,
            emp.phone,
            emp.email || "-",
            emp.status,
            emp.baseSalary || "-"
        ].join(",")
    );

    const csv = ["Name,Role,Phone,Email,Status,Base Salary", ...rows].join("\n");
    downloadCSV(csv, "employee_timesheet.csv");
    showToast("Đã xuất employee_timesheet.csv", "success");
}