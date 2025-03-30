// List of employees & Admin 
const users = [
    { name: "Patrick Salazar", id: "Patrick Salazar", password: "10101", role: "employee" },
    { name: "Vladimir Abinal", id: "Vladimir Abinal", password: "10102", role: "employee" },
    { name: "Roy Syon", id: "Roy Syon", password: "10103", role: "employee" },
    { name: "Kristine Antalan", id: " Kristine Antalan", password: "10104", role: "employee" },
    { name: "Chelsea Hinojosa", id: "Chelsea Hinojosa", password: "10105", role: "employee" },
    { name: "Admin", id: "Admin", password: "admin123", role: "admin" }
];

// Handle Login
document.getElementById("loginForm").addEventListener("submit", function (event) {
    event.preventDefault();

    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value.trim();
    let errorMessage = document.getElementById("error-message");

    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    let user = users.find(user => user.id === username && user.password === password) ||
        employees.find(emp => emp.name === username && emp.password === password);

    if (user) {
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        window.location.href = user.role === "admin" ? "admin.html" : "employee.html";
    } else {
        errorMessage.textContent = "Invalid Username or Password!";
    }
});

// Auto Redirect if User is Already Logged In
document.addEventListener("DOMContentLoaded", function () {
    let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser) {
        window.location.href = loggedInUser.role === "admin" ? "admin.html" : "employee.html";
    }
});

// Toggle Password Visibility
function togglePassword() {
    let passwordField = document.getElementById("password");
    if (passwordField.type === "password") {
        passwordField.type = "text";
    } else {
        passwordField.type = "password";
    }
}