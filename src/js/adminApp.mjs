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
    const error = new Error(data.message || "操作失败，请稍后重试。");
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
  return value
    ? new Date(value).toLocaleString("zh-CN", { hour12: false })
    : "-";
}

function formatProvider(value) {
  return value
    ? value
        .split(",")
        .map(
          (provider) =>
            ({ google: "Google", microsoft: "Microsoft" })[provider] ||
            provider,
        )
        .join("、")
    : "-";
}

function formatSubscriptionStatus(value) {
  return (
    {
      active: "生效",
      trialing: "生效",
      canceled: "已取消",
      incomplete: "未完成",
      past_due: "已逾期",
      unpaid: "未付款",
    }[value] ||
    value ||
    "-"
  );
}

function formatBillingInterval(value) {
  return { month: "月付", year: "年付" }[value] || value || "-";
}

function renderStats(stats) {
  const labels = [
    ["注册用户总数", stats.totalUsers],
    ["Google 用户", stats.googleUsers],
    ["Microsoft 用户", stats.microsoftUsers],
    ["当前付费用户", stats.proUsers],
    ["正式付费", stats.activePaidUsers],
    ["月付用户", stats.monthlyUsers],
    ["年付用户", stats.yearlyUsers],
    ["今日新增", stats.todayUsers],
    ["近 7 日新增", stats.last7DaysUsers],
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
  usersStatus.textContent = "正在加载用户……";
  const params = new URLSearchParams({ page: String(page), q: query });
  const data = await api(`/api/admin/users?${params}`);
  usersBody.replaceChildren(
    ...data.users.map((user) => {
      const row = document.createElement("tr");
      for (const value of [
        user.name,
        user.email,
        formatProvider(user.loginProvider),
        {
          free: "免费方案",
          parent: "家长方案",
          teacher: "教师方案",
          plus: "家长方案（历史兼容）",
          pro: "教师方案（历史兼容）",
        }[user.plan] || "免费方案",
        formatSubscriptionStatus(user.subscriptionStatus),
        formatBillingInterval(user.billingInterval),
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
  pageLabel.textContent = `第 ${data.page} / ${pages} 页 · 共 ${data.total} 位用户`;
  previous.disabled = data.page <= 1;
  next.disabled = data.page >= pages;
  usersStatus.textContent = data.users.length ? "" : "没有找到用户。";
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

for (const button of document.querySelectorAll("[data-auth-provider]")) {
  button.addEventListener("click", async () => {
    const provider = button.dataset.authProvider;
    const providerName = provider === "microsoft" ? "Microsoft" : "Google";
    const status = document.getElementById("admin-login-status");
    button.disabled = true;
    status.textContent = `正在打开 ${providerName} 登录……`;
    try {
      const config = await api("/api/config");
      if (!config[`${provider}AuthConfigured`])
        throw new Error(`${providerName} 登录尚未配置。`);
      const result = await api("/api/auth/sign-in/social", {
        method: "POST",
        body: JSON.stringify({ provider, callbackURL: "/admin" }),
      });
      if (!result.url) throw new Error(`${providerName} 登录暂不可用。`);
      location.href = result.url;
    } catch (error) {
      status.textContent = error.message;
      status.className = "status error";
      button.disabled = false;
    }
  });
}

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
