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
const ordersBody = document.getElementById("admin-orders");
const ordersStatus = document.getElementById("admin-orders-status");
const ordersPageLabel = document.getElementById("admin-orders-page");
const ordersPrevious = document.getElementById("admin-orders-previous");
const ordersNext = document.getElementById("admin-orders-next");
const orderQueryInput = document.getElementById("admin-order-query");
let page = 1;
let query = "";
let ordersPage = 1;
let orderQuery = "";

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
    const message =
      {
        sign_in_required: "请先登录后再继续。",
        admin_forbidden: "当前账号没有管理后台访问权限。",
        invalid_origin: "请求来源无效，请刷新页面后重试。",
        json_required: "请求格式不正确。",
        invalid_json: "请求内容格式不正确。",
        body_too_large: "请求内容过大。",
        invalid_page: "页码必须是正整数。",
        invalid_admin_plan: "请选择有效的方案。",
        user_not_found: "未找到该用户。",
        method_not_allowed: "不支持此请求方式。",
        admin_not_found: "未找到该管理接口。",
      }[data.error] || "操作失败，请稍后重试。";
    const error = new Error(message);
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

function formatPlan(value) {
  return (
    {
      free: "免费方案",
      parent: "家长方案",
      teacher: "教师方案",
      plus: "家长方案（历史兼容）",
      pro: "教师方案（历史兼容）",
    }[value] || "免费方案"
  );
}

function formatOrderStatus(value) {
  return (
    {
      pending: "待完成",
      completed: "已完成，待确认支付",
      paid: "支付成功",
      failed: "支付失败",
      canceled: "已取消",
      expired: "已过期",
    }[value] ||
    value ||
    "-"
  );
}

function formatAmount(amount, currency) {
  if (!Number.isInteger(amount) || !currency) return "-";
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
  }
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
        `${formatPlan(user.plan)}${user.adminPlan ? "（管理员指定）" : ""}`,
        formatSubscriptionStatus(user.subscriptionStatus),
        formatBillingInterval(user.billingInterval),
        formatDate(user.currentPeriodEnd),
        formatDate(user.createdAt),
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      const actionCell = document.createElement("td");
      const controls = document.createElement("div");
      controls.className = "admin-plan-controls";
      const select = document.createElement("select");
      select.setAttribute("aria-label", `调整 ${user.email} 的方案`);
      for (const [value, label] of [
        ["", "按订阅自动判断"],
        ["parent", "家长方案"],
        ["teacher", "教师方案"],
      ]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = (user.adminPlan || "") === value;
        select.append(option);
      }
      const save = document.createElement("button");
      save.type = "button";
      save.className = "button-secondary";
      save.textContent = "保存";
      save.addEventListener("click", async () => {
        select.disabled = true;
        save.disabled = true;
        usersStatus.textContent = "正在保存方案……";
        try {
          await api(`/api/admin/users/${encodeURIComponent(user.id)}/plan`, {
            method: "PUT",
            body: JSON.stringify({ plan: select.value || null }),
          });
          usersStatus.textContent = "方案已更新。";
          await loadUsers();
        } catch (error) {
          usersStatus.textContent = error.message;
          select.disabled = false;
          save.disabled = false;
        }
      });
      controls.append(select, save);
      actionCell.append(controls);
      row.append(actionCell);
      return row;
    }),
  );
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  pageLabel.textContent = `第 ${data.page} / ${pages} 页 · 共 ${data.total} 位用户`;
  previous.disabled = data.page <= 1;
  next.disabled = data.page >= pages;
  usersStatus.textContent = data.users.length ? "" : "没有找到用户。";
}

async function loadOrders() {
  ordersStatus.textContent = "正在加载充值订单……";
  const params = new URLSearchParams({
    page: String(ordersPage),
    q: orderQuery,
  });
  const data = await api(`/api/admin/orders?${params}`);
  ordersBody.replaceChildren(
    ...data.orders.map((order) => {
      const row = document.createElement("tr");
      for (const value of [
        formatDate(order.createdAt),
        order.name,
        order.email,
        formatPlan(order.plan),
        formatBillingInterval(order.billingInterval),
        formatAmount(order.amountTotal, order.currency),
        formatOrderStatus(order.status),
        order.id,
        formatDate(order.updatedAt),
      ]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    }),
  );
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  ordersPageLabel.textContent = `第 ${data.page} / ${pages} 页 · 共 ${data.total} 笔订单`;
  ordersPrevious.disabled = data.page <= 1;
  ordersNext.disabled = data.page >= pages;
  ordersStatus.textContent = data.orders.length ? "" : "没有找到充值订单。";
}

async function loadDashboard() {
  const stats = await api("/api/admin/stats");
  show(dashboard);
  signOut.hidden = false;
  renderStats(stats);
  await Promise.all([loadUsers(), loadOrders()]);
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

document
  .getElementById("admin-order-search")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    orderQuery = orderQueryInput.value.trim();
    ordersPage = 1;
    await loadOrders().catch(
      (error) => (ordersStatus.textContent = error.message),
    );
  });

ordersPrevious.addEventListener("click", async () => {
  ordersPage -= 1;
  await loadOrders().catch(
    (error) => (ordersStatus.textContent = error.message),
  );
});

ordersNext.addEventListener("click", async () => {
  ordersPage += 1;
  await loadOrders().catch(
    (error) => (ordersStatus.textContent = error.message),
  );
});

document.getElementById("admin-refresh").addEventListener("click", async () => {
  await loadDashboard().catch((error) => {
    usersStatus.textContent = error.message;
    ordersStatus.textContent = error.message;
  });
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
