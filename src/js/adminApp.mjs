const statusCard = document.getElementById("admin-status");
const loginCard = document.getElementById("admin-login");
const deniedCard = document.getElementById("admin-denied");
const dashboard = document.getElementById("admin-dashboard");
const signOut = document.getElementById("sign-out");
const usersBody = document.getElementById("admin-users");
const usersStatus = document.getElementById("admin-users-status");
const pageLabel = document.getElementById("admin-page");
const previous = document.getElementById("admin-previous");
const next = document.getElementById("admin-next");
const queryInput = document.getElementById("admin-query");
let page = 1;
let query = "";

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: options.body
      ? { "content-type": "application/json", ...options.headers }
      : options.headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function show(element) {
  for (const item of [statusCard, loginCard, deniedCard, dashboard])
    item.hidden = item !== element;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

function renderStats(stats) {
  const labels = [
    ["Total users", stats.totalUsers],
    ["Google users", stats.googleUsers],
    ["Current Pro", stats.proUsers],
    ["Trialing", stats.trialingUsers],
    ["Active paid", stats.activePaidUsers],
    ["Monthly", stats.monthlyUsers],
    ["Yearly", stats.yearlyUsers],
    ["New today", stats.todayUsers],
    ["New in 7 days", stats.last7DaysUsers],
  ];
  const grid = document.getElementById("admin-stats");
  grid.replaceChildren(
    ...labels.map(([label, value]) => {
      const card = document.createElement("div");
      card.className = "stat-card";
      const number = document.createElement("strong");
      number.className = "stat-value";
      number.textContent = value;
      card.append(number, label);
      return card;
    }),
  );
}

async function loadUsers() {
  usersStatus.textContent = "Loading users…";
  const params = new URLSearchParams({ page: String(page), q: query });
  const data = await api(`/api/admin/users?${params}`);
  usersBody.replaceChildren(
    ...data.users.map((user) => {
      const row = document.createElement("tr");
      for (const value of [
        user.name,
        user.email,
        user.loginProvider || "-",
        user.plan === "pro" ? "Pro" : "Free",
        user.subscriptionStatus || "-",
        user.billingInterval || "-",
        user.trialUsed ? "Yes" : "No",
        formatDate(user.currentPeriodEnd),
        formatDate(user.createdAt),
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    }),
  );
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  pageLabel.textContent = `Page ${data.page} of ${pages} · ${data.total} users`;
  previous.disabled = data.page <= 1;
  next.disabled = data.page >= pages;
  usersStatus.textContent = data.users.length ? "" : "No users found.";
}

async function loadDashboard() {
  const stats = await api("/api/admin/stats");
  show(dashboard);
  signOut.hidden = false;
  renderStats(stats);
  await loadUsers();
}

document
  .getElementById("admin-search")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    query = queryInput.value.trim();
    page = 1;
    await loadUsers().catch(
      (error) => (usersStatus.textContent = error.message),
    );
  });

previous.addEventListener("click", async () => {
  page -= 1;
  await loadUsers().catch((error) => (usersStatus.textContent = error.message));
});

next.addEventListener("click", async () => {
  page += 1;
  await loadUsers().catch((error) => (usersStatus.textContent = error.message));
});

document.getElementById("admin-refresh").addEventListener("click", async () => {
  await loadDashboard().catch(
    (error) => (usersStatus.textContent = error.message),
  );
});

document.getElementById("admin-sign-in").addEventListener("click", async () => {
  const button = document.getElementById("admin-sign-in");
  const status = document.getElementById("admin-login-status");
  button.disabled = true;
  status.textContent = "Opening Google sign-in…";
  try {
    const config = await api("/api/config");
    if (!config.googleAuthConfigured)
      throw new Error("Google sign-in is not configured.");
    const result = await api("/api/auth/sign-in/social", {
      method: "POST",
      body: JSON.stringify({ provider: "google", callbackURL: "/admin" }),
    });
    if (!result.url) throw new Error("Google sign-in is unavailable.");
    location.href = result.url;
  } catch (error) {
    status.textContent = error.message;
    status.className = "status error";
    button.disabled = false;
  }
});

signOut.addEventListener("click", async () => {
  await api("/api/auth/sign-out", { method: "POST", body: "{}" }).catch(
    () => null,
  );
  location.reload();
});

loadDashboard().catch((error) => {
  signOut.hidden = error.status === 401;
  if (error.status === 401) show(loginCard);
  else if (error.status === 403) show(deniedCard);
  else statusCard.querySelector(".status").textContent = error.message;
});
