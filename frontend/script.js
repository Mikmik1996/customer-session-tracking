console.log("✅ SCRIPT LOADED");

/* ==========================================
   ⏰ TIME FORMAT
========================================== */
function formatRemainingTime(totalSeconds) {
  if (totalSeconds <= 0) return "00:00:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

/* ==========================================
   📁 SIDEBAR NAVIGATION
========================================== */
function showSection(id) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  if (id === "reports") {
    setTimeout(loadChart, 300);
  }
}

function setActive(btn) {
  document.querySelectorAll(".menu button").forEach(b => {
    b.classList.remove("active");
  });
  btn.classList.add("active");
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  window.location.href = "/";
}

/* ==========================================
   ➕ ADD SESSION
========================================== */
async function addSession() {
  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const pkg = document.getElementById("package").value;

  if (!name || !pkg) {
    alert("⚠️ Please fill out required fields.");
    return;
  }

  try {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: name,
        client_contact: contact,
        package_id: parseInt(pkg, 10),
        staff_id: 1
      })
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById("name").value = "";
      document.getElementById("contact").value = "";
      document.getElementById("package").value = "";

      await loadSessions();

      const msg = document.getElementById("msg");
      msg.innerText = "✅ Session added!";
      msg.style.opacity = "1";
      setTimeout(() => msg.style.opacity = "0", 2000);
    } else {
      alert("❌ Failed to add session.");
    }

  } catch (err) {
    console.error("❌ Error adding session:", err);
  }
}

/* ==========================================
   📊 LOAD ACTIVE SESSIONS
========================================== */
async function loadSessions() {
  try {
    const res = await fetch("/api/sessions/active");
    const data = await res.json();

    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;

    let html = "";

    data.forEach(s => {
      const start = new Date(s.start_time);
      const now = new Date();

      let duration = 30;
      switch (Number(s.package_id)) {
        case 2: duration = 60; break;
        case 3: duration = 90; break;
        case 4: duration = 120; break;
        case 5: duration = 999; break;
      }

duration += Number(s.extension_minutes || 0);
    
let remain = Math.floor(
  (duration * 60) - ((now - start) / 1000)
);
const expired = remain <= 0;

if (remain < 0) {
  remain = 0;
}

      const timeIn = start.toLocaleTimeString("en-PH");
      let timeOut = "-";

      if (duration < 999) {
        const end = new Date(start.getTime() + duration * 60000);
        timeOut = end.toLocaleTimeString("en-PH");
      } else {
        timeOut = "Unlimited";
      }

      let status = "normal";
      if (remain <= 0) status = "expired";
      else if (remain <= 300) status = "warning";

      html += `
<tr>
<td>

<input
  type="text"
  class="editable-name"
  value="${s.client_name}"
  data-id="${s.id}"
  onchange="saveCustomerName(this)"
>

</td>

  <td>${timeIn}</td>
  <td>${timeOut}</td>

  <td class="${status}">
    ${
      duration >= 999
        ? '<span class="badge unlimited">Unlimited</span>'
        : formatRemainingTime(remain)
    }
  </td>

  <td>
  <button class="extend"
        onclick="extendSession(${s.id}, 30)">
  +30m
</button>

<button class="extend"
        onclick="extendSession(${s.id}, 60)">
  +60m
</button>
  <button class="remove"
          onclick="removeSession(${s.id})">
    Remove
  </button>
</td>
</tr>
`;
    });

    tableBody.innerHTML = html;

  } catch (err) {
    console.error("❌ Error loading sessions:", err);
  }
}

/* ==========================================
   🛑 REMOVE SESSION
========================================== */
async function removeSession(id) {
  if (!confirm("End this session?")) return;

  try {
    await fetch(`/api/sessions/${id}/end`, { method: "POST" });
    loadSessions();
  } catch (err) {
    console.error("❌ Error removing session:", err);
  }
}

async function removeExpiredSessions() {
  if (
    !confirm(
      "Remove all sessions with remaining time 00:00:00?"
    )
  ) {
    return;
  }

  try {
    const res = await fetch(
      "/api/sessions/remove-expired",
      {
        method: "POST"
      }
    );

    const data = await res.json();

    if (data.success) {
      alert("✅ Expired sessions removed.");
      loadSessions();
    }

  } catch (err) {
    console.error(err);
    alert("Failed to remove expired sessions.");
  }
}

/* ==========================================
   ➕ EXTEND SESSION
========================================== */
async function extendSession(id, minutes) {

  try {

    const res = await fetch(
      `/api/sessions/${id}/extend`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ minutes })
      }
    );

    const data = await res.json();   
if (data.success) {

  alert(`✅ Session extended by ${minutes} minutes`);

  setTimeout(() => {
    loadSessions();
  }, 500);
}

 } catch (err) {
    console.error(err);
    alert("Failed to extend session.");
  }
}

/* ==========================================
   ✏️ EDIT CUSTOMER NAME
========================================== */
async function editCustomerName(id, currentName) {

  const newName = prompt(
    "Enter corrected customer name:",
    currentName
  );

  if (!newName) return;

  try {

    const res = await fetch(
      `/api/sessions/${id}/update-name`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_name: newName
        })
      }
    );

    const data = await res.json();

    if (data.success) {
      loadSessions();
    }

  } catch (err) {
    console.error(err);
  }
}
/* ==========================================
   ✅ SAVE CUSTOMER NAME
========================================== */
async function saveCustomerName(element) {

  const id = element.dataset.id;
  const newName = element.value.trim();

  if (!newName) return;

  try {

    const res = await fetch(
      `/api/sessions/${id}/update-name`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_name: newName
        })
      }
    );

    const data = await res.json();

    if (data.success) {
      console.log("Customer name updated");
    }

  } catch (err) {
    console.error(err);
  }
}

/* ==========================================
   📈 LOAD CHART
========================================== */
let chart;

async function loadChart() {
  const canvas = document.getElementById("chart");

  if (!canvas) {
    console.error("❌ Chart canvas not found");
    return;
  }

  const start = document.getElementById("startDate")?.value || "";
  const end = document.getElementById("endDate")?.value || "";

  console.log("✅ Filter clicked");
  console.log("Start Date:", start);
  console.log("End Date:", end);

  let url = "/api/chart-data";

  if (start && end) {
    url += `?start=${start}&end=${end}`;
  }

  console.log("✅ Final URL:", url);

  try {
    const res = await fetch(url);

    console.log("✅ Status:", res.status);

    const data = await res.json();

    console.log("✅ API Response:", data);

    const grouped = {};

    data.forEach(d => {
      grouped[d.package_name] =
        (grouped[d.package_name] || 0) + d.count;
    });

    const labels = Object.keys(grouped);
    const values = Object.values(grouped);

    console.log("Labels:", labels);
    console.log("Values:", values);

    const ctx = canvas.getContext("2d");

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Registered Customers",
          data: values,
          backgroundColor: "#1c7ed6",
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });

  } catch (err) {
    console.error("❌ Error loading chart:", err);
  }
}

/* ==========================================
   📥 EXPORT CSV
========================================== */
function downloadCSV() {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  let url = "/api/export";
  if (start && end) {
    url += `?start=${start}&end=${end}`;
  }

  window.location.href = url;
}

/* ==========================================
   🚦 INITIALIZE
========================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadSessions();
  showSection("registration");

  setInterval(loadSessions, 30000);
});

