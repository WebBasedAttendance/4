document.addEventListener("DOMContentLoaded", function () {
    const menuBtn = document.getElementById("menu-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");
    const timeInBtn = document.getElementById("timeInBtn");
    const timeOutBtn = document.getElementById("timeOutBtn");
    const searchBar = document.getElementById("attendanceSearchBar");
    const downloadBtn = document.getElementById("downloadBtn");
    const prevPageBtn = document.getElementById("prevPage");
    const nextPageBtn = document.getElementById("nextPage");

    // Event Listeners
    menuBtn?.addEventListener("click", toggleSidebar);
    logoutBtn?.addEventListener("click", handleLogout);
    timeInBtn?.addEventListener("click", handleTimeIn);
    timeOutBtn?.addEventListener("click", handleTimeOut);
    searchBar?.addEventListener("input", loadEmployeeAttendance);
    downloadBtn?.addEventListener("click", downloadPDF);
    prevPageBtn?.addEventListener("click", showPreviousWeek);
    nextPageBtn?.addEventListener("click", showNextWeek);

    // Initial Setup
    showSection("timeInOut");
    startClock();
    loadEmployeeAttendance();
    autoMarkAbsentAtMidnight();
    checkAndGenerateWeeklySchedule();
});

let currentWeekStartDate = getStartOfWeek(new Date());

// To Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const menuBtn = document.querySelector(".menu-btn");
    const mainContent = document.querySelector(".main-content");

    sidebar.classList.toggle("hidden");
    menuBtn.classList.toggle("hidden");
    mainContent.classList.toggle("collapsed");
}

// Clock
function startClock() {
    const clock = document.getElementById("clock");
    setInterval(() => {
        clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }, 1000);
}

// To Logout 
function handleLogout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
}

// To Show Section
function showSection(sectionId) {
    document.querySelectorAll(".content-section").forEach(section => {
        section.style.display = "none";
    });

    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = "block";

        if (sectionId === "attendanceRecords") {
            loadEmployeeAttendance();
        }
    }
}

// To Time In
function handleTimeIn() {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser) return;

    const now = new Date();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const shiftType = getShiftType(now);

    if (shiftType === "Invalid") {
        alert("You can only time in during the specified hours for Morning (6AM - 11:59AM) or Afternoon (12PM - 9:30PM).");
        return;
    }

    if (!confirm("Are you sure you want to time in?")) return;

    const today = now.toISOString().split("T")[0];
    const attendanceRecords = getAttendanceRecords();

    const existingMorningRecord = attendanceRecords.find(
        record => record.date === today && record.name === loggedInUser.name && record.shift === "Morning"
    );

    const existingAfternoonRecord = attendanceRecords.find(
        record => record.date === today && record.name === loggedInUser.name && record.shift === "Afternoon"
    );

    if (shiftType === "Morning" && existingMorningRecord && existingMorningRecord.timeIn) {
        alert("You can only time in once for the Morning shift.");
        return;
    } else if (shiftType === "Afternoon" && existingAfternoonRecord && existingAfternoonRecord.timeIn) {
        alert("You can only time in once for the Afternoon shift.");
        return;
    }

    attendanceRecords.push({
        date: today,
        name: loggedInUser.name,
        shift: shiftType,
        timeIn: currentTime,
        timeOut: "",
        status: "Present" // Set status to Present
    });

    saveAttendanceRecords(attendanceRecords);
    alert("✔️ Time In recorded!");
    loadEmployeeAttendance();

    // Save the attendance record in admin.js
    if (typeof saveAttendanceRecord === "function") {
        saveAttendanceRecord(loggedInUser.name, shiftType, currentTime, "", "Present");
    }
}

// To Time Out
function handleTimeOut() {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser) return;

    const now = new Date();
    const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const shiftType = getShiftType(now);

    if (shiftType === "Invalid") {
        alert("You can only time out during the specified hours for Morning (6AM - 11:59AM) or Afternoon (12PM - 9:30PM).");
        return;
    }

    if (!confirm("Are you sure you want to time out?")) return;

    const today = now.toISOString().split("T")[0];
    const attendanceRecords = getAttendanceRecords();

    const openRecord = attendanceRecords.find(
        record => record.date === today && record.name === loggedInUser.name && !record.timeOut && record.shift === shiftType
    );
    if (!openRecord) {
        alert("You must time in before timing out!");
        return;
    }

    if (shiftType === "Morning" && openRecord.timeOut) {
        alert("You can only time out once for the Morning shift.");
        return;
    } else if (shiftType === "Afternoon" && openRecord.timeOut) {
        alert("You can only time out once for the Afternoon shift.");
        return;
    }

    openRecord.timeOut = currentTime;

    saveAttendanceRecords(attendanceRecords);
    alert("✔️ Time Out recorded!");
    loadEmployeeAttendance();

    // Save the attendance record in admin.js
    if (typeof saveAttendanceRecord === "function") {
        saveAttendanceRecord(loggedInUser.name, openRecord.shift, openRecord.timeIn, currentTime, "Present");
    }
}

// To Save Attendance Records
function saveAttendanceRecords(records) {
    localStorage.setItem("attendance", JSON.stringify(records));
}

// To Get Shift Type
function getShiftType(now) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours >= 6 && hours < 12) {
        return "Morning";
    } else if (hours >= 12 && (hours < 21 || (hours === 21 && minutes <= 30))) {
        return "Afternoon";
    } else {
        return "Invalid";
    }
}

// To Get Logged-In User
function getLoggedInUser() {
    return JSON.parse(localStorage.getItem("loggedInUser"));
}

// To Load Attendance Records
function loadEmployeeAttendance() {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser) return;

    const tableContainer = document.getElementById("attendanceTableBody");
    const monthYearDisplay = document.getElementById("monthYearDisplay");
    const tableHeader = document.getElementById("attendanceTable").querySelector("thead");
    tableContainer.innerHTML = "";

    const currentMonth = currentWeekStartDate.toLocaleString("default", { month: "long" });
    const currentYear = currentWeekStartDate.getFullYear();

    if (monthYearDisplay) {
        monthYearDisplay.textContent = `${currentMonth} ${currentYear}`;
    }

    const weekDates = getWeekDates(currentWeekStartDate);
    const attendanceRecords = getAttendanceRecords();
    const userRecords = attendanceRecords.filter(record => record.name === loggedInUser.name);

    // Update table header with week dates
    const headerRow = tableHeader.querySelector("tr:last-child");
    headerRow.innerHTML = `
        <th>Name</th>
        <th>Shift</th>
        ${weekDates.map(date => `<th>${date.toLocaleDateString("default", { weekday: "long", day: "numeric" })}</th>`).join('')}
    `;

    // Initialize groupedByShift object
    const groupedByShift = {
        Morning: {},
        Afternoon: {}
    };

    weekDates.forEach(date => {
        const dateStr = date.toISOString().split("T")[0]; // Use the same format as attendance records
        groupedByShift.Morning[dateStr] = { in: "", out: "" };
        groupedByShift.Afternoon[dateStr] = { in: "", out: "" };
    });

    userRecords.forEach(record => {
        const recordDate = new Date(record.date);
        const dateStr = recordDate.toISOString().split("T")[0]; // Use the same format as attendance records

        if (groupedByShift[record.shift] && groupedByShift[record.shift][dateStr]) {
            groupedByShift[record.shift][dateStr].in = formatTime(record.timeIn);
            groupedByShift[record.shift][dateStr].out = formatTime(record.timeOut || "");
        }
    });

    const createRow = (shift) => {
        let row = `<tr><td>${loggedInUser.name}</td><td>${shift}</td>`;
        weekDates.forEach(date => {
            const dateStr = date.toISOString().split("T")[0]; // Use the same format as attendance records
            row += `<td>In: ${groupedByShift[shift][dateStr].in} | Out: ${groupedByShift[shift][dateStr].out}</td>`;
        });
        row += `</tr>`;
        return row;
    };

    // Ensure the name is displayed only once
    const morningRow = createRow("Morning");
    const afternoonRow = createRow("Afternoon").replace(`<td>${loggedInUser.name}</td>`, `<td></td>`);
    tableContainer.innerHTML += morningRow + afternoonRow;

    // Remove existing month and year header if present
    const existingMonthYearHeader = tableHeader.querySelector(".month-year-header");
    if (existingMonthYearHeader) {
        existingMonthYearHeader.remove();
    }
    const monthYearHeader = document.createElement("tr");
    monthYearHeader.className = "month-year-header";
    monthYearHeader.innerHTML = `<th colspan="9" id="monthYearDisplay">${currentMonth} ${currentYear}</th>`;
    tableHeader.insertBefore(monthYearHeader, tableHeader.firstChild);
}

// To Format Time
function formatTime(time) {
    if (!time) return "";
    const [hours, minutes] = time.match(/(\d+):(\d+)/).slice(1);
    const period = time.includes("AM") ? "AM" : "PM";
    return `${hours}:${minutes}${period}`;
}

// To Save Attendance Records
function saveAttendanceRecords(records) {
    localStorage.setItem("attendance", JSON.stringify(records));
}

function getAttendanceRecords() {
    const records = JSON.parse(localStorage.getItem("attendance")) || [];
    // Ensure the records are always an array
    return Array.isArray(records) ? records : [];
}

// To download Attendance records
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape");

    const table = document.getElementById("attendanceTable");
    if (!table) {
        alert("No attendance data available.");
        return;
    }

    const headers = Array.from(table.querySelectorAll("thead tr:nth-child(2) th")).map(th => th.textContent);
    const rows = Array.from(table.querySelectorAll("tbody tr")).map(tr => {
        return Array.from(tr.querySelectorAll("td")).map(td => td.innerText);
    });

    const monthYearDisplay = document.getElementById("monthYearDisplay").textContent;

    doc.text(`Attendance Records for ${getLoggedInUser()?.name}`, 14, 10);
    doc.text(monthYearDisplay, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.autoTable({
        head: [headers],
        body: rows,
        theme: 'striped',
        styles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [0, 123, 255],
            textColor: [255, 255, 255],
        },
        alternateRowStyles: {
            fillColor: [248, 249, 250],
        },
        startY: 30,
        margin: { top: 20 },
        tableWidth: 'auto',
    });

    doc.save("attendance_records.pdf");
}

// Auto Mark Absent at Midnight
function autoMarkAbsentAtMidnight() {
    const now = new Date();
    const millisTillMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0) - now;

    setTimeout(() => {
        const attendanceRecords = getAttendanceRecords();
        const today = new Date().toISOString().split("T")[0];

        attendanceRecords.forEach(record => {
            if (record.date === today && !record.timeIn) {
                record.timeIn = "Absent";
                record.timeOut = "Absent";
            }
        });

        saveAttendanceRecords(attendanceRecords);
    }, millisTillMidnight);
}

// Auto Generate Weekly Schedule
function checkAndGenerateWeeklySchedule() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // Sunday - Saturday: 0 - 6

    if (dayOfWeek === 0) { // If it's Sunday
        const attendanceRecords = getAttendanceRecords();
        const lastWeek = attendanceRecords.slice(-7);

        if (lastWeek.length < 7) {
            generateWeeklySchedule();
        }
    }
}

function generateWeeklySchedule() {
    const loggedInUser = getLoggedInUser();
    if (!loggedInUser) return;

    const currentDate = new Date();
    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const newSchedule = weekDays.map((day, index) => ({
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + index).toISOString().split("T")[0],
        name: loggedInUser.name,
        shift: "Morning",
        timeIn: "",
        timeOut: ""
    }));

    saveAttendanceRecords(newSchedule);
}

// Get Start of Week Date
function getStartOfWeek(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(date.setDate(diff));
}

// Get Dates for the Week
function getWeekDates(startOfWeek) {
    const dates = [];
    const currentDate = new Date(startOfWeek);
    for (let i = 0; i < 7; i++) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

// Show Previous Week
function showPreviousWeek() {
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() - 7);
    loadEmployeeAttendance();
}

// Show Next Week
function showNextWeek() {
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
    loadEmployeeAttendance();
}

// Ensure the loadEmployeeAttendance function is called when the DOM content is fully loaded
document.addEventListener("DOMContentLoaded", loadEmployeeAttendance);