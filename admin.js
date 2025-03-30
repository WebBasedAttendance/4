// Ensure the `attendancePage` variable is defined
let attendancePage = 0;
const attendancePageSize = 10;

document.addEventListener("DOMContentLoaded", function () {
    const menuBtn = document.getElementById("menu-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const sidebar = document.querySelector(".sidebar");

    if (menuBtn) {
        menuBtn.addEventListener("click", function () {
            if (sidebar) {
                sidebar.classList.toggle("hidden");
                if (sidebar.classList.contains("hidden")) {
                    menuBtn.style.left = "5px"; // Move button to the left corner
                } else {
                    menuBtn.style.left = "225px"; // Move button back to beside the sidebar
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem("loggedInUser");
            window.location.href = "index.html";
        });
    }

    showSection('dashboard');

    const prevAttendancePageBtn = document.getElementById("prevAttendancePage");
    const nextAttendancePageBtn = document.getElementById("nextAttendancePage");

    if (prevAttendancePageBtn) {
        prevAttendancePageBtn.addEventListener("click", function () {
            if (attendancePage > 0) {
                attendancePage--;
                loadAttendanceRecords();
            }
        });
    }

    if (nextAttendancePageBtn) {
        nextAttendancePageBtn.addEventListener("click", function () {
            attendancePage++;
            loadAttendanceRecords();
        });
    }

    // Reset dashboard attendance at 3:00 AM
    setInterval(resetDashboardCounters, getMillisecondsTo3AM());
    setInterval(resetDashboardAttendance, getMillisecondsTo3AM());

    loadDashboardAttendance();
    loadEmployees();
    clearPreviousAttendanceRecords(); // Clear previous attendance records before loading new ones
    loadAttendanceRecords();
    loadArchivedData(); // Load archived data on page load
    updateEmployeeCounters(); // Update employee counters on page load

    // Add event listener to the delete button
    const deleteButton = document.getElementById("deleteDisplayedRecordsBtn");
    if (deleteButton) {
        deleteButton.addEventListener("click", deleteDisplayedRecords);
    }

    const searchInput = document.getElementById("searchAttendance");
    if (searchInput) {
        searchInput.addEventListener("input", searchAttendance);
    }

    const downloadButton = document.getElementById("downloadAttendanceButton");
    if (downloadButton) {
        downloadButton.addEventListener("click", downloadAttendancePDF);
    }

    // Add event listener to open modal
    const totalAttendanceModal = document.getElementById("totalAttendanceModal");
    if (totalAttendanceModal) {
        const closeTotalBtn = totalAttendanceModal.querySelector(".close");
        const calculateTotalBtn = document.getElementById("calculateTotalAttendance");

        const openModalButton = document.getElementById("openTotalAttendanceModal");
        if (openModalButton) {
            openModalButton.addEventListener("click", function () {
                totalAttendanceModal.style.display = "block";
                populateTotalEmployeeSelect();
            });
        }

        if (closeTotalBtn) {
            closeTotalBtn.addEventListener("click", function () {
                totalAttendanceModal.style.display = "none";
            });
        }

        window.addEventListener("click", function (event) {
            if (event.target === totalAttendanceModal) {
                totalAttendanceModal.style.display = "none";
            }
        });

        if (calculateTotalBtn) {
            calculateTotalBtn.addEventListener("click", function () {
                const selectedEmployee = document.getElementById("totalEmployeeSelect").value;
                const startDate = document.getElementById("startDate").value;
                const endDate = document.getElementById("endDate").value;

                if (selectedEmployee && startDate && endDate) {
                    calculateTotalAttendance(selectedEmployee, startDate, endDate);
                } else {
                    alert("Please fill out all fields.");
                }
            });
        }
    }

    // Ensure the loadAttendanceRecords function is called when the DOM content is fully loaded
    document.addEventListener("DOMContentLoaded", loadAttendanceRecords);
});

// Ensure the loadAttendanceRecords function is called when the DOM content is fully loaded
document.addEventListener("DOMContentLoaded", loadAttendanceRecords);

// Ensure the showSection function is defined globally
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = "none";
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = "block";
    }

    // Add active class to the clicked section link and remove from others
    document.querySelectorAll('.sidebar ul li a').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.sidebar ul li a[href="#${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Load Dashboard Attendance
function loadDashboardAttendance() {
    let tableBody = document.getElementById("dashboardAttendanceTable")?.querySelector("tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    let allRecords = JSON.parse(localStorage.getItem("attendance")) || [];
    let todayDate = new Date().toISOString().split("T")[0];
    let employeeRecords = {};
    let presentCount = 0;
    let absentCount = 0;

    // Load all employees
    let allEmployees = JSON.parse(localStorage.getItem("employees")) || [];

    // Initialize employee records
    allEmployees.forEach(employee => {
        employeeRecords[employee.name] = { morning: "-", night: "-", status: "" };
    });

    // Update employee records based on today's attendance
    allRecords.forEach(record => {
        if (record.date === todayDate) {
            let shiftRecord = `${record.timeIn} | ${record.timeOut}`;
            if (!employeeRecords[record.name]) {
                employeeRecords[record.name] = { morning: "-", night: "-", status: "" };
            }

            // Determine shift based on timeIn
            let timeIn = parseTime(record.timeIn);
            if (timeIn.hours >= 6 && timeIn.hours < 19) {
                employeeRecords[record.name].morning = shiftRecord;
            } else {
                employeeRecords[record.name].night = shiftRecord;
            }

            // Mark as present within the specific time range
            if ((timeIn.hours >= 6 && timeIn.hours < 19) || (timeIn.hours >= 19 && timeIn.hours < 21) || (timeIn.hours === 21 && timeIn.minutes <= 30)) {
                employeeRecords[record.name].status = "Present";
                presentCount++;
            }
        }
    });

    // Current time to compare against 9:30 PM
    let currentTime = new Date();
    let cutoffTime = new Date();
    cutoffTime.setHours(21, 30, 0, 0); // 9:30 PM

    // Count absent employees if it's past 9:30 PM and they haven't timed in within the specific time range
    if (currentTime >= cutoffTime) {
        allEmployees.forEach(employee => {
            if (employeeRecords[employee.name].status === "") {
                employeeRecords[employee.name].status = "Absent";
                absentCount++;
            }
        });
    }

    // Populate dashboard attendance table
    for (let employee in employeeRecords) {
        let row = document.createElement("tr");
        row.innerHTML = `
        <td>${employee}</td>
        <td>${employeeRecords[employee].morning}</td>
        <td>${employeeRecords[employee].night}</td>
        <td>${employeeRecords[employee].status}</td>
    `;
        tableBody.appendChild(row);
    }

    // Update present and absent counts
    const totalEmployees = allEmployees.length;
    document.getElementById("presentEmployeesCount").innerText = presentCount;
    document.getElementById("absentEmployeesCount").innerText = absentCount;
    document.getElementById("totalEmployeesCount").innerText = totalEmployees;
}

// Utility function to parse time in HH:MM format
function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
}

// Function to get milliseconds until 3 AM the next day
function getMillisecondsTo3AM() {
    let now = new Date();
    let next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    if (now >= next3AM) {
        next3AM.setDate(next3AM.getDate() + 1);
    }
    return next3AM - now;
}

// Reset Dashboard Counters
function resetDashboardCounters() {
    document.getElementById("presentEmployeesCount").innerText = "0";
    document.getElementById("absentEmployeesCount").innerText = "0";
}

// Reset Dashboard Attendance
function resetDashboardAttendance() {
    let tableBody = document.getElementById("dashboardAttendanceTable")?.querySelector("tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    let allRecords = JSON.parse(localStorage.getItem("attendance")) || [];
    let todayDate = new Date().toISOString().split("T")[0];
    let employeeRecords = {};

    // Load all employees
    let allEmployees = JSON.parse(localStorage.getItem("employees")) || [];

    // Initialize employee records
    allEmployees.forEach(employee => {
        employeeRecords[employee.name] = { morning: "-", night: "-", status: "" };
    });

    // Update employee records based on today's attendance
    allRecords.forEach(record => {
        if (record.date === todayDate) {
            let shiftRecord = `${record.timeIn} | ${record.timeOut}`;
            if (!employeeRecords[record.name]) {
                employeeRecords[record.name] = { morning: "-", night: "-", status: "" };
            }

            // Determine shift based on timeIn
            let timeIn = parseTime(record.timeIn);
            if (timeIn.hours >= 6 && timeIn.hours < 19) {
                employeeRecords[record.name].morning = shiftRecord;
            } else {
                employeeRecords[record.name].night = shiftRecord;
            }

            // Mark as present within the specific time range
            if ((timeIn.hours >= 6 && timeIn.hours < 19) || (timeIn.hours >= 19 && timeIn.hours < 21) || (timeIn.hours === 21 && timeIn.minutes <= 30)) {
                employeeRecords[record.name].status = "Present";
            }
        }
    });

    // Current time to compare against 9:30 PM
    let currentTime = new Date();
    let cutoffTime = new Date();
    cutoffTime.setHours(21, 30, 0, 0); // 9:30 PM

    // Count absent employees if it's past 9:30 PM and they haven't timed in within the specific time range
    if (currentTime >= cutoffTime) {
        allEmployees.forEach(employee => {
            if (employeeRecords[employee.name].status === "") {
                employeeRecords[employee.name].status = "Absent";
            }
        });
    }

    // Populate dashboard attendance table
    for (let employee in employeeRecords) {
        let row = document.createElement("tr");
        row.innerHTML = `
        <td>${employee}</td>
        <td>${employeeRecords[employee].morning}</td>
        <td>${employeeRecords[employee].night}</td>
        <td>${employeeRecords[employee].status}</td>
    `;
        tableBody.appendChild(row);
    }
}

// Update Employee Counters
function updateEmployeeCounters() {
    const totalEmployees = JSON.parse(localStorage.getItem("employees"))?.length || 0;
    document.getElementById("totalEmployeesCount").innerText = totalEmployees;
}

// Search Employees
function searchEmployee() {
    let input = document.getElementById("searchEmployee").value.toLowerCase();
    let rows = document.querySelectorAll("#employeeTable tbody tr");

    rows.forEach(row => {
        let name = row.cells[0].textContent.toLowerCase();
        row.style.display = name.includes(input) ? "" : "none";
    });
}

// Load Employees
function loadEmployees() {
    let tableBody = document.getElementById("employeeTable")?.querySelector("tbody");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    employees.forEach(employee => {
        let row = document.createElement("tr");
        row.innerHTML = `
            <td>${employee.name}</td>
            <td>${employee.birthdate}</td>
            <td>${employee.gender}</td>
            <td>${employee.address}</td>
            <td>${employee.phone}</td>
            <td>${employee.email}</td>
            <td>${employee.password}</td>
            <td>${employee.since}</td>
            <td>
                <button class="table-button" onclick="editEmployee('${employee.id}')">✏️</button>
                <button class="table-button" onclick="deleteEmployee('${employee.id}')">🗑️</button>
            </td>
        `;

        tableBody.appendChild(row);
    });
    updateEmployeeCounters();
}

// Open and Close Add Employee Form
function openAddEmployeeForm() {
    document.getElementById("addEmployeeModal").style.display = "block";
}

function closeAddEmployeeForm() {
    document.getElementById("addEmployeeModal").style.display = "none";
}

// Submit Add Employee Form
function submitAddEmployee() {
    let name = document.getElementById("employeeName").value;
    let birthdate = document.getElementById("employeeBirthdate").value;
    let gender = document.querySelector('input[name="employeeGender"]:checked');
    let address = document.getElementById("employeeAddress").value;
    let phone = document.getElementById("employeePhone").value;
    let email = document.getElementById("employeeEmail").value;
    let password = document.getElementById("employeePassword").value;

    if (!name || !birthdate || !gender || !address || !phone || !email || !password) {
        alert("Please fill out all fields.");
        return;
    }

    const phonePattern = /^09\d{9}$/;
    if (!phonePattern.test(phone)) {
        alert("Incorrect Phone Number.");
        return;
    }

    const emailPattern = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/;
    if (!emailPattern.test(email)) {
        alert("Incorrect Email.");
        return;
    }

    if (confirm("Are you sure you want to add this employee?")) {
        let employees = JSON.parse(localStorage.getItem("employees")) || [];
        let newEmployee = {
            id: Date.now().toString(),
            name: name,
            birthdate: birthdate,
            gender: gender.value,
            address: address,
            phone: phone,
            email: email,
            password: password,
            since: new Date().toISOString().split("T")[0]
        };

        employees.push(newEmployee);
        localStorage.setItem("employees", JSON.stringify(employees));
        loadEmployees();
        closeAddEmployeeForm();
    }
}

// Function to Create Account
function submitLogin() {
    let name = document.getElementById("loginName").value;
    let password = document.getElementById("loginPassword").value;

    if (!name || !password) {
        alert("Please fill out all fields.");
        return;
    }

    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    let employee = employees.find(emp => emp.name === name && emp.password === password);

    if (employee) {
        alert("Login successful!");
        window.location.href = "dashboard.html";
    } else {
        document.getElementById("loginError").style.display = "block";
    }
}

// Edit Password
function editEmployee(empId) {
    let employees = JSON.parse(localStorage.getItem("employees")) || [];
    let employee = employees.find(emp => emp.id === empId);

    if (employee) {
        let newPassword = prompt("Enter new password:", employee.password);

        if (newPassword) {
            employee.password = newPassword;

            localStorage.setItem("employees", JSON.stringify(employees));
            loadEmployees();
        }
    }
}

// Delete Employee
function deleteEmployee(empId) {
    if (confirm("Are you sure you want to delete this employee?")) {
        let employees = JSON.parse(localStorage.getItem("employees")) || [];
        let employee = employees.find(emp => emp.id === empId);

        if (employee) {

            let archives = JSON.parse(localStorage.getItem("archives")) || { employees: [], attendance: [] };
            if (!Array.isArray(archives.employees)) {
                archives.employees = [];
            }
            archives.employees.push(employee);

            let allRecords = JSON.parse(localStorage.getItem("attendance")) || [];
            let employeeRecords = allRecords.filter(record => record.name === employee.name);
            if (!Array.isArray(archives.attendance)) {
                archives.attendance = [];
            }
            archives.attendance.push(...employeeRecords);

            employees = employees.filter(emp => emp.id !== empId);
            allRecords = allRecords.filter(record => record.name !== employee.name);

            localStorage.setItem("archives", JSON.stringify(archives));
            localStorage.setItem("employees", JSON.stringify(employees));
            localStorage.setItem("attendance", JSON.stringify(allRecords));

            loadEmployees();
            loadAttendanceRecords();
            updateEmployeeCounters();

            alert("Employee successfully deleted.");
        }
    }
}

// Function to delete displayed attendance records and move them to archive
function deleteDisplayedRecords() {
    console.log("Delete button clicked");
    if (confirm("Are you sure you want to delete the displayed attendance records?")) {
        let tableBody = document.getElementById("attendanceRecordsTable")?.querySelector("tbody");
        if (!tableBody) return;
        let rows = tableBody.querySelectorAll("tr");
        let archives = JSON.parse(localStorage.getItem("archives")) || { employees: [], attendance: [] };
        if (!Array.isArray(archives.attendance)) {
            archives.attendance = [];
        }
        let allRecords = JSON.parse(localStorage.getItem("attendance")) || [];

        rows.forEach(row => {
            let name = row.cells[0].innerText;
            let shift = row.cells[1].innerText;

            allRecords = allRecords.filter(record => {
                if (record.name === name && record.shift === shift) {
                    archives.attendance.push(record);
                    return false;
                }
                return true;
            });
        });

        localStorage.setItem("archives", JSON.stringify(archives));
        localStorage.setItem("attendance", JSON.stringify(allRecords));

        loadAttendanceRecords();

        // Complete the success message setup
        const successMessage = document.createElement("div");
        successMessage.innerText = "Attendance records successfully deleted.";
        successMessage.style.color = "green";
        successMessage.style.marginTop = "10px";
        const attendanceTableRecords = document.getElementById("attendanceRecordsTable");
        if (attendanceTableRecords) {
            attendanceTableRecords.parentElement.appendChild(successMessage);

            setTimeout(() => {
                successMessage.remove();
            }, 3000);
        }
    }
}

// Load Archived Data
function loadArchivedData() {
    let archives = JSON.parse(localStorage.getItem("archives")) || { employees: [], attendance: [] };

    let employeeTableBody = document.getElementById("archivedEmployeesTableBody");
    if (employeeTableBody) {
        employeeTableBody.innerHTML = "";

        if (Array.isArray(archives.employees)) {
            archives.employees.forEach(employee => {
                let row = document.createElement("tr");
                row.innerHTML = `
                    <td>${employee.since}</td>
                    <td>${employee.name}</td>
                    <td>${employee.password}</td>
                    <td>
                        <button onclick="restoreEmployee('${employee.id}')">🔄 Restore</button>
                    </td>
                `;
                employeeTableBody.appendChild(row);
            });
        }
    }

    let attendanceTableBody = document.getElementById("archivedAttendanceRecordsTableBody");
    if (attendanceTableBody) {
        attendanceTableBody.innerHTML = "";

        if (Array.isArray(archives.attendance)) {
            archives.attendance.forEach(record => {
                let row = document.createElement("tr");
                row.innerHTML = `
                    <td>${record.name}</td>
                    <td>${record.shift}</td>
                    <td>${record.date}</td>
                    <td>${record.timeIn}</td>
                    <td>${record.timeOut}</td>
                    <td>
                        <button onclick="restoreAttendanceRecord('${record.name}', '${record.shift}', '${record.date}')">🔄 Restore</button>
                    </td>
                `;
                attendanceTableBody.appendChild(row);
            });
        }
    }
}

// Restore Employee
function restoreEmployee(empId) {
    let archives = JSON.parse(localStorage.getItem("archives")) || { employees: [], attendance: [] };
    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    let employee = archives.employees.find(emp => emp.id === empId);
    if (employee) {
        employees.push(employee);
        archives.employees = archives.employees.filter(emp => emp.id !== empId);

        localStorage.setItem("employees", JSON.stringify(employees));
        localStorage.setItem("archives", JSON.stringify(archives));

        loadEmployees();
        loadArchivedData();
        updateEmployeeCounters();
    }
}

// Restore Attendance Record
function restoreAttendanceRecord(name, shift, date) {
    let archives = JSON.parse(localStorage.getItem("archives")) || { employees: [], attendance: [] };
    let attendance = JSON.parse(localStorage.getItem("attendance")) || [];

    let record = archives.attendance.find(rec => rec.name === name && rec.shift === shift && rec.date === date);
    if (record) {
        attendance.push(record);
        archives.attendance = archives.attendance.filter(rec => rec.name !== name || rec.shift !== shift || rec.date !== date);

        localStorage.setItem("attendance", JSON.stringify(attendance));
        localStorage.setItem("archives", JSON.stringify(archives));

        loadAttendanceRecords();
        loadArchivedData();
    }
}

// View Record
function viewRecord(employeeName, shift) {
    // Implement the logic to view detailed records for the specified employee and shift
    console.log(`Viewing record for ${employeeName} (${shift})`);
}

// Search Attendance
function searchAttendance() {
    const input = document.getElementById("searchAttendance").value.toLowerCase();
    const rows = document.querySelectorAll("#attendanceRecordsTable tbody tr");

    let recordsFound = false;

    rows.forEach(row => {
        const name = row.cells[0]?.textContent?.toLowerCase() || '';

        if (name.includes(input)) {
            recordsFound = true;
            row.style.display = ""; // Show row
        } else {
            row.style.display = "none"; // Hide row
        }
    });

    // Show a message if no records are found
    const attendanceTableBody = document.getElementById("attendanceTableBody");

    if (!recordsFound && attendanceTableBody) {
        let noRecordsMessage = document.getElementById("noRecordsMessage");
        if (!noRecordsMessage) {
            noRecordsMessage = document.createElement("tr");
            noRecordsMessage.id = "noRecordsMessage";
            noRecordsMessage.innerHTML = `<td colspan="9" style="text-align: center;">No records found for the specified criteria</td>`;
            attendanceTableBody.appendChild(noRecordsMessage);
        }
    } else {
        const noRecordsMessage = document.getElementById("noRecordsMessage");
        if (noRecordsMessage) {
            noRecordsMessage.remove();
        }
    }
}

// Ensure the searchAttendance function is called when the search input changes
document.getElementById("searchAttendance").addEventListener("input", searchAttendance);

// Load Attendance Records
function loadAttendanceRecords() {
    const tableContainer = document.getElementById("attendanceRecordsTable");
    if (!tableContainer) return;
    tableContainer.innerHTML = "";

    const allRecords = JSON.parse(localStorage.getItem("attendance")) || [];
    const employees = JSON.parse(localStorage.getItem("employees")) || [];
    const weeklyLogs = {};

    // Initialize weekly logs and ensure default values for each day of the week
    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const startDate = new Date(); // Use the current date as the start date
    const weekDates = getWeekDates(startDate);

    allRecords.forEach(record => {
        const logDate = new Date(record.date);
        const weekNumber = getWeekNumber(logDate);

        if (!weeklyLogs[weekNumber]) {
            weeklyLogs[weekNumber] = { dates: weekDates, employees: {} };
        }

        if (!weeklyLogs[weekNumber].employees[record.name]) {
            weeklyLogs[weekNumber].employees[record.name] = {};
        }

        const dayIndex = logDate.getDay(); // 0 (Sunday) to 6 (Saturday)
        const dayName = weekDates[dayIndex === 0 ? 6 : dayIndex - 1].toLocaleDateString("en-US", { weekday: "long", day: "numeric" });

        // Initialize the employee record for the specific day
        if (!weeklyLogs[weekNumber].employees[record.name][dayName]) {
            weeklyLogs[weekNumber].employees[record.name][dayName] = { Morning: { timeIn: "-", timeOut: "-" }, Afternoon: { timeIn: "-", timeOut: "-" } };
        }

        // Determine if the record belongs to Morning or Afternoon shift
        const timeIn = parseTime(record.timeIn);
        if (timeIn.hours < 12) {
            // Morning shift
            weeklyLogs[weekNumber].employees[record.name][dayName].Morning = {
                timeIn: record.timeIn,
                timeOut: record.timeOut
            };
        } else {
            // Afternoon shift
            weeklyLogs[weekNumber].employees[record.name][dayName].Afternoon = {
                timeIn: record.timeIn,
                timeOut: record.timeOut
            };
        }
    });

    const start = attendancePage * attendancePageSize;
    const end = start + attendancePageSize;
    const paginatedWeeks = Object.keys(weeklyLogs).slice(start, end);

    paginatedWeeks.forEach(week => {
        const weekDates = weeklyLogs[week].dates;
        const weekTable = document.createElement("table");
        weekTable.classList.add("attendance-week-table");

        // Add month and year header
        const monthYearHeader = document.createElement("div");
        monthYearHeader.classList.add("month-year-header");
        monthYearHeader.style.backgroundColor = "green";
        monthYearHeader.style.color = "white";
        monthYearHeader.style.padding = "10px";
        monthYearHeader.style.textAlign = "center";
        monthYearHeader.textContent = getMonthYear(weekDates[0]);
        tableContainer.appendChild(monthYearHeader);

        const weekHeader = document.createElement("thead");
        weekHeader.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Shift</th>
            ${weekDates.map(date => `<th>${date.toLocaleDateString("en-US", { weekday: "long", day: "numeric" })}</th>`).join("")}
        </tr>
    `;
        weekTable.appendChild(weekHeader);

        const weekBody = document.createElement("tbody");

        employees.forEach(employee => {
            const morningRow = [employee.name, "Morning"];
            const afternoonRow = ["", "Afternoon"];

            weekDays.forEach((day, index) => {
                const dayDate = weekDates[index === 0 ? 6 : index - 1].toLocaleDateString("en-US", { weekday: "long", day: "numeric" });
                const record = weeklyLogs[week].employees[employee.name]?.[dayDate] || { Morning: { timeIn: "-", timeOut: "-" }, Afternoon: { timeIn: "-", timeOut: "-" } };
                morningRow.push(`${record.Morning.timeIn} | ${record.Morning.timeOut}`);
                afternoonRow.push(`${record.Afternoon.timeIn} | ${record.Afternoon.timeOut}`);
            });

            const morningRowElement = document.createElement("tr");
            morningRowElement.innerHTML = `<td>${morningRow.join("</td><td>")}</td>`;
            weekBody.appendChild(morningRowElement);

            const afternoonRowElement = document.createElement("tr");
            afternoonRowElement.innerHTML = `<td>${afternoonRow.join("</td><td>")}</td>`;
            weekBody.appendChild(afternoonRowElement);
        });

        weekTable.appendChild(weekBody);
        tableContainer.appendChild(weekTable);
    });

    document.getElementById("prevAttendancePage").disabled = attendancePage === 0;
    document.getElementById("nextAttendancePage").disabled = end >= Object.keys(weeklyLogs).length;
}

// Utility function to parse time in HH:MM format
function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
}

// Function to get the month and year from a date
function getMonthYear(date) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

// Function to get week dates
function getWeekDates(date) {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - (date.getDay() || 7) + 1); // Start on Monday
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        week.push(day);
    }
    return week;
}

// Function to save attendance record
function saveAttendanceRecord(employeeName, shift, timeIn, timeOut, status) {
    const allRecords = JSON.parse(localStorage.getItem("attendance")) || [];
    const todayDate = new Date().toISOString().split("T")[0];

    console.log('Saving attendance for:', employeeName, shift, timeIn, timeOut, status);

    // Check if a record for today and the same shift already exists
    const existingRecordIndex = allRecords.findIndex(record => record.name === employeeName && record.shift === shift && record.date === todayDate);
    if (existingRecordIndex !== -1) {
        // Update existing record
        allRecords[existingRecordIndex].timeIn = timeIn;
        allRecords[existingRecordIndex].timeOut = timeOut;
        allRecords[existingRecordIndex].status = status;
    } else {
        // Add new record
        allRecords.push({
            name: employeeName,
            shift: shift,
            date: todayDate,
            timeIn: timeIn,
            timeOut: timeOut,
            status: status
        });
    }

    localStorage.setItem("attendance", JSON.stringify(allRecords));
    console.log('Updated attendance records:', allRecords);
    loadDashboardAttendance(); // Reload the dashboard to display the updated data
    updateEmployeeCounters(); // Update employee counters
}

// Function to get week number
function getWeekNumber(date) {
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startDate) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((date.getDay() + 1 + days) / 7);
    return weekNumber;
}

// Calculate total attendance summary
function calculateTotalAttendance(employeeName, startDate, endDate) {
    const allRecords = JSON.parse(localStorage.getItem("attendance")) || [];

    let presentDays = 0, absentDays = 0;

    startDate = new Date(startDate);
    endDate = new Date(endDate);

    console.log(`Calculating attendance for ${employeeName} from ${startDate.toDateString()} to ${endDate.toDateString()}`);

    // Create a set of dates for the range
    const dateSet = new Set();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dateSet.add(d.toISOString().split("T")[0]);
    }

    // Check records for each date in the range
    allRecords.forEach(record => {
        const recordDate = new Date(record.date);
        if (record.name === employeeName && recordDate >= startDate && recordDate <= endDate) {
            console.log(`Found record: ${record.date} - ${record.status}`);
            if (record.status === "Present") {
                presentDays++;
            } else if (record.status === "Absent") {
                absentDays++;
            }
            // Remove the date from the set as it's accounted for
            dateSet.delete(record.date);
        }
    });

    // Remaining dates in the set are absent
    absentDays += dateSet.size;

    const summaryElement = document.getElementById("totalAttendanceSummary");
    if (summaryElement) {
        summaryElement.innerHTML = `
            <p>Total Present Days: ${presentDays}</p>
            <p>Total Absent Days: ${absentDays}</p>
        `;
    } else {
        console.error("Element #totalAttendanceSummary not found.");
    }
}

// Ensure the calculateTotalAttendance function is called when the calculate button is clicked
const calculateTotalBtn = document.getElementById("calculateTotalAttendance");
if (calculateTotalBtn) {
    calculateTotalBtn.addEventListener("click", function () {
        const selectedEmployee = document.getElementById("totalEmployeeSelect").value;
        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;

        if (selectedEmployee && startDate && endDate) {
            calculateTotalAttendance(selectedEmployee, startDate, endDate);
        } else {
            alert("Please fill out all fields.");
        }
    });
}

// Ensure the loadAttendanceRecords function is called when the DOM content is fully loaded
document.addEventListener("DOMContentLoaded", loadAttendanceRecords);

// Populate employee select options for total attendance
function populateTotalEmployeeSelect() {
    const employeeSelect = document.getElementById("totalEmployeeSelect");
    const employees = JSON.parse(localStorage.getItem("employees")) || [];

    employeeSelect.innerHTML = ''; // Clear existing options
    employees.forEach(employee => {
        const option = document.createElement("option");
        option.value = employee.name;
        option.textContent = employee.name;
        employeeSelect.appendChild(option);
    });
}

// Auto Mark Absent at 9:30 PM
function autoMarkAbsentAt930PM() {
    const now = new Date();
    const millisTill930PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 30, 0, 0) - now;

    setTimeout(() => {
        const attendanceRecords = getAttendanceRecords();
        const today = new Date().toISOString().split("T")[0];

        attendanceRecords.forEach(record => {
            if (record.date === today && !record.timeIn && !record.timeOut) {
                record.status = "Absent";
            }
        });

        saveAttendanceRecords(attendanceRecords);
    }, millisTill930PM);
}

// Call the autoMarkAbsentAt930PM function when the DOM content is fully loaded
document.addEventListener("DOMContentLoaded", autoMarkAbsentAt930PM);

// To Get Attendance Records
function getAttendanceRecords() {
    return JSON.parse(localStorage.getItem("attendance")) || [];
}

// Clear previous attendance records
function clearPreviousAttendanceRecords() {
    const allRecords = JSON.parse(localStorage.getItem("attendance")) || [];
    const todayDate = new Date().toISOString().split("T")[0];
    const updatedRecords = allRecords.filter(record => record.date === todayDate);

    localStorage.setItem("attendance", JSON.stringify(updatedRecords));
    console.log('Cleared previous attendance records:', updatedRecords);
}

// Pagination Controls for Attendance Records
const prevAttendancePageBtn = document.getElementById("prevAttendancePage");
const nextAttendancePageBtn = document.getElementById("nextAttendancePage");

if (prevAttendancePageBtn) {
    prevAttendancePageBtn.addEventListener("click", function () {
        if (attendancePage > 0) {
            attendancePage--;
            loadAttendanceRecords();
        }
    });
}

if (nextAttendancePageBtn) {
    nextAttendancePageBtn.addEventListener("click", function () {
        attendancePage++;
        loadAttendanceRecords();
    });
}

// Download Attendance Function
function downloadAttendancePDF() {
    if (typeof window.jspdf === "undefined" || typeof window.jspdf.jsPDF === "undefined") {
        alert("Error: jsPDF library is missing!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape");

    const table = document.getElementById("attendanceRecordsTable");
    if (!table) {
        alert("Error: Attendance records table not found!");
        return;
    }

    const head = table.querySelector("thead");
    const body = table.querySelector("tbody");
    if (!head || !body) {
        alert("Error: The table structure is incorrect!");
        return;
    }

    const data = [];
    const columns = [];

    head.querySelectorAll("tr th").forEach(th => {
        columns.push(th.innerText);
    });

    body.querySelectorAll("tr").forEach(row => {
        if (row.style.display !== "none") {
            const rowData = [];
            row.querySelectorAll("td").forEach(td => {
                rowData.push(td.innerText);
            });
            data.push(rowData);
        }
    });

    const currentDate = new Date();
    const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    doc.setFontSize(16);
    doc.text(monthYear, 14, 20);

    doc.setFontSize(14);
    doc.text("ATTENDANCE RECORDS", 100, 10, null, null, "center");

    doc.autoTable({
        head: [columns],
        body: data,
        theme: "grid",
        startY: 30,
        margin: { top: 20 }
    });

    doc.save("attendance-records.pdf");
}

const downloadButton = document.getElementById("downloadAttendanceButton");
if (downloadButton) {
    downloadButton.addEventListener("click", downloadAttendancePDF);
}
