console.log("✅ SCRIPT LOADED");

/* =======================
   ✅ TIME FORMAT (UPDATED FOR HH:MM:SS)
======================= */
function formatRemainingTime(totalSeconds) {
  if (totalSeconds <= 0) return "00:00:00";

  // 1. Calculate hours, minutes, and seconds
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  // 2. Pad with leading zeros so it always looks uniform (e.g., 01:24:06)
  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
}

/* =======================
   ✅ SIDEBAR
======================= */
function showSection(id) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  const el = document.getElementById(id);
  if (el) el.classList.add("active");

  if (id === "reports") {
    setTimeout(loadChart, 100);
  }
}

function setActive(btn) {
  document.querySelectorAll(".menu button").forEach(b => {
    b.classList.remove("active");
  });

  btn.classList.add("active");
}

function logout() {
  window.location.href = "/";
}

/* =======================
   ✅ ADD SESSION (UPDATED FOR INSTANT REFRESH)
======================= */
async function addSession() {
  const name = document.getElementById("name").value;
  const contact = document.getElementById("contact").value;
  const package_id = document.getElementById("package").value;

  try {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_name: name,
        client_contact: contact,
        package_id: parseInt(package_id),
        staff_id: 1
      })
    });

    const data = await res.json();

    if (data.success) {
      console.log("✅ Session saved");

      // 1. CLEAR input fields immediately so the UI feels responsive
      document.getElementById("name").value = "";
      document.getElementById("contact").value = "";
      document.getElementById("package").value = "";

      // 2. FORCE an immediate table reload right now (Fixes the 2-second jump!)
      await loadSessions();

      // 3. Show success banner
      const msg = document.getElementById("msg");
      msg.innerText = "✅ Session added!";
      msg.style.opacity = "1";

      setTimeout(() => {
        msg.style.opacity = "0";
      }, 2000);

    } else {
      alert("❌ Failed to add session");
    }

  } catch (err) {
    console.error("❌ Add session error:", err);
  }
}

/* =======================
   ✅ DASHBOARD (UPDATED RENDERING)
======================= */
async function loadSessions() {
  try {
    const res = await fetch("/api/sessions/active");

    if (!res.ok) {
      console.error("❌ API error:", res.status);
      return;
    }

    const data = await res.json();
    let html = "";

    data.forEach(s => {
      const start = new Date(s.start_time);
      const now = new Date();

      let duration = 30;

      if (s.package_id == 1) duration = 30;
      else if (s.package_id == 2) duration = 60;
      else if (s.package_id == 3) duration = 90;
      else if (s.package_id == 4) duration = 120;
      else if (s.package_id == 5) duration = 999;

      let remain = (duration * 60) - ((now - start) / 1000);
      if (remain < 0) remain = 0;

      const timeIn = start.toLocaleTimeString("en-PH", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      let timeOut = "-";

      if (duration < 999) {
        const end = new Date(start.getTime() + duration * 60000);

        timeOut = end.toLocaleTimeString("en-PH", {
          timeZone: "Asia/Manila",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        });
      } else {
        timeOut = "Unlimited";
      }

      let color = "normal";
      if (remain <= 0) color = "expired";
      else if (remain <= 300) color = "warning";

      html += `
        <tr>
          <td>${s.client_name}</td>
          <td>${timeIn}</td>
          <td>${timeOut}</td>
          <td class="${color}">
            ${duration >= 999 ? "Unlimited" : formatRemainingTime(remain)}
          </td>
          <td>
            <button class="remove" onclick="removeSession(${s.id})">Remove</button>
          </td>
        </tr>
      `;
    });

    document.getElementById("tableBody").innerHTML = html;

  } catch (err) {
    console.error("❌ Load sessions error:", err);
  }
}

/* =======================
   ✅ REMOVE SESSION
======================= */
async function removeSession(id) {
  await fetch(`/api/sessions/${id}/end`, { method: "POST" });
  loadSessions();
}

/* =======================
   ✅ CHART (UPDATED WITH DYNAMIC FILTER PASSING)
======================= */
let chart; // Globally tracks your active chart object to prevent tooltips overlapping

async function loadChart() {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

  // 1. Capture the dates selected in the HTML input boxes right now
  const startVal = document.getElementById("startDate").value;
  const endVal = document.getElementById("endDate").value;

  // 2. Append values onto backend parameters if both text fields are populated
  let url = "/api/chart-data";
  if (startVal && endVal) {
    url += `?start=${startVal}&end=${endVal}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    const labels = data.map(d => d.package_name);
    const values = data.map(d => d.count);

    const ctx = canvas.getContext("2d");

    // 3. Destroy old instance if it exists to break canvas memory cache locks
    if (chart) {
      chart.destroy();
    }

    // 4. Render fresh clean filtered column items
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Customers",
          data: values,
          backgroundColor: "#1c7ed6"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });

  } catch (err) {
    console.error("❌ Load chart analytics error:", err);
  }
}

/* =======================
   ✅ EXPORT (UPDATED TO REMEMBER APPLIED DATES)
======================= */
function downloadCSV() {
  const startVal = document.getElementById("startDate").value;
  const endVal = document.getElementById("endDate").value;

  let url = "/api/export";
  if (startVal && endVal) {
    url += `?start=${startVal}&end=${endVal}`;
  }

  // Execute clean spreadsheet target download redirection window call
  window.location.href = url;
}

/* =======================
   ✅ AUTO LOAD
======================= */
setInterval(loadSessions, 2000);
loadSessions();