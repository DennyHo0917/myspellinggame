const $ = (id) => document.getElementById(id);
const statusCard = $("admin-status");
const loginCard = $("admin-login");
const deniedCard = $("admin-denied");
const dashboard = $("admin-dashboard");
const signOut = $("sign-out");
const usersBody = $("admin-users");
const usersStatus = $("admin-users-status");
const pageLabel = $("admin-page");
const previous = $("admin-previous");
const next = $("admin-next");
const queryInput = $("admin-query");
const planFilter = $("admin-plan-filter");
const providerFilter = $("admin-provider-filter");
const ordersBody = $("admin-orders");
const ordersStatus = $("admin-orders-status");
const ordersPageLabel = $("admin-orders-page");
const ordersPrevious = $("admin-orders-previous");
const ordersNext = $("admin-orders-next");
const orderQueryInput = $("admin-order-query");
const orderStatusFilter = $("admin-order-status-filter");
const drawer = $("admin-user-drawer");
const drawerStatus = $("admin-drawer-status");
const drawerPlan = $("admin-drawer-plan");
const relatedOrders = $("admin-user-orders");
let page = 1;
let query = "";
let plan = "";
let provider = "";
let ordersPage = 1;
let orderQuery = "";
let orderStatus = "";
let ordersLoaded = false;
let selectedUser = null;

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
        invalid_plan_filter: "请选择有效的方案筛选条件。",
        invalid_provider_filter: "请选择有效的登录方式筛选条件。",
        invalid_order_status_filter: "请选择有效的订单状态筛选条件。",
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
  if (element !== dashboard && drawer.open) drawer.close();
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString("zh-CN", {
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
}

function formatProvider(value) {
  return value
    ? value
        .split(",")
        .map(
          (item) =>
            ({ google: "Google", microsoft: "Microsoft" })[item] || item,
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
      pending: "待处理",
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
      completed: "待确认支付",
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

function textCell(value, className = "") {
  const cell = document.createElement("td");
  cell.className = className;
  cell.textContent = value;
  return cell;
}

function badgeCell(value, kind) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `admin-badge admin-badge-${kind}`;
  badge.textContent = value;
  cell.append(badge);
  return cell;
}

function renderStats(stats) {
  const labels = [
    ["总用户", stats.totalUsers],
    ["付费用户", stats.proUsers],
    ["今日新增", stats.todayUsers],
    ["近 7 日新增", stats.last7DaysUsers],
  ];
  $("admin-stats").replaceChildren(
    ...labels.map(([label, value]) => {
      const card = document.createElement("div");
      card.className = "stat-card";
      const number = document.createElement("strong");
      number.className = "stat-value";
      number.textContent = value;
      const name = document.createElement("span");
      name.textContent = label;
      card.append(name, number);
      return card;
    }),
  );
  $("admin-secondary-stats").textContent =
    `登录方式：Google ${stats.googleUsers} · Microsoft ${stats.microsoftUsers}` +
    ` · 计费周期：月付 ${stats.monthlyUsers} · 年付 ${stats.yearlyUsers}`;
}

async function loadUsers() {
  usersStatus.textContent = "正在加载用户……";
  const params = new URLSearchParams({
    page: String(page),
    q: query,
    plan,
    provider,
  });
  const data = await api(`/api/admin/users?${params}`);
  usersBody.replaceChildren(
    ...data.users.map((user) => {
      const row = document.createElement("tr");
      row.className = "admin-clickable-row";
      row.append(
        textCell(user.name),
        textCell(user.email),
        textCell(formatProvider(user.loginProvider)),
        badgeCell(formatPlan(user.plan), user.plan),
        textCell(formatDate(user.lastLoginAt)),
        textCell(formatDate(user.createdAt)),
      );
      const action = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button-secondary admin-detail-button";
      button.textContent = "查看详情";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        void openUserDrawer(user);
      });
      action.append(button);
      row.append(action);
      row.addEventListener("click", () => void openUserDrawer(user));
      return row;
    }),
  );
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  pageLabel.textContent = `第 ${data.page} / ${pages} 页 · 共 ${data.total} 位用户`;
  previous.disabled = data.page <= 1;
  next.disabled = data.page >= pages;
  usersStatus.textContent = data.users.length ? "" : "没有找到用户。";
}

function renderOrderUser(order) {
  const cell = document.createElement("td");
  const name = document.createElement("strong");
  name.textContent = order.name;
  const email = document.createElement("small");
  email.textContent = order.email;
  cell.append(name, email);
  return cell;
}

async function loadOrders() {
  ordersStatus.textContent = "正在加载订单……";
  const params = new URLSearchParams({
    page: String(ordersPage),
    q: orderQuery,
    status: orderStatus,
  });
  const data = await api(`/api/admin/orders?${params}`);
  ordersLoaded = true;
  ordersBody.replaceChildren(
    ...data.orders.map((order) => {
      const row = document.createElement("tr");
      row.append(
        textCell(formatDate(order.createdAt)),
        renderOrderUser(order),
        badgeCell(formatPlan(order.plan), order.plan),
        textCell(formatBillingInterval(order.billingInterval)),
        textCell(formatAmount(order.amountTotal, order.currency)),
        badgeCell(formatOrderStatus(order.status), order.status),
        textCell(order.id, "admin-order-id"),
      );
      return row;
    }),
  );
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  ordersPageLabel.textContent = `第 ${data.page} / ${pages} 页 · 共 ${data.total} 笔订单`;
  ordersPrevious.disabled = data.page <= 1;
  ordersNext.disabled = data.page >= pages;
  ordersStatus.textContent = data.orders.length ? "" : "没有找到订单。";
}

function detailPair(label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  return [term, description];
}

function renderUserDetails(user) {
  $("admin-drawer-title").textContent = user.name || "未命名用户";
  $("admin-user-details").replaceChildren(
    ...[
      ["用户 ID", user.id],
      ["姓名", user.name],
      ["邮箱", user.email],
      ["登录方式", formatProvider(user.loginProvider)],
      ["当前方案", formatPlan(user.plan)],
      ["订阅状态", formatSubscriptionStatus(user.subscriptionStatus)],
      ["计费周期", formatBillingInterval(user.billingInterval)],
      ["周期结束时间", formatDate(user.currentPeriodEnd)],
      [
        "管理员指定",
        user.adminPlan ? formatPlan(user.adminPlan) : "按订阅自动判断",
      ],
      ["最后登录时间", formatDate(user.lastLoginAt)],
      ["注册时间", formatDate(user.createdAt)],
    ].flatMap(([label, value]) => detailPair(label, value)),
  );
  drawerPlan.value = user.adminPlan || "";
}

function renderRelatedOrders(orders) {
  if (!orders.length) {
    relatedOrders.textContent = "该用户暂无订单记录。";
    return;
  }
  relatedOrders.replaceChildren(
    ...orders.slice(0, 5).map((order) => {
      const item = document.createElement("div");
      item.className = "admin-related-order";
      const title = document.createElement("strong");
      title.textContent = `${formatPlan(order.plan)} · ${formatBillingInterval(order.billingInterval)}`;
      const meta = document.createElement("span");
      meta.textContent = `${formatDate(order.createdAt)} · ${formatOrderStatus(order.status)} · ${formatAmount(order.amountTotal, order.currency)}`;
      const id = document.createElement("small");
      id.textContent = order.id;
      item.append(title, meta, id);
      return item;
    }),
  );
}

async function openUserDrawer(user) {
  selectedUser = user;
  drawerStatus.textContent = "";
  relatedOrders.textContent = "正在加载订单……";
  renderUserDetails(user);
  if (!drawer.open) drawer.showModal();
  try {
    const params = new URLSearchParams({ page: "1", q: user.email });
    const data = await api(`/api/admin/orders?${params}`);
    if (selectedUser?.id === user.id) renderRelatedOrders(data.orders);
  } catch (error) {
    if (selectedUser?.id === user.id) relatedOrders.textContent = error.message;
  }
}

async function loadDashboard() {
  const stats = await api("/api/admin/stats");
  show(dashboard);
  signOut.hidden = false;
  renderStats(stats);
  await loadUsers();
}

function selectTab(name) {
  const usersSelected = name === "users";
  $("admin-users-tab").setAttribute("aria-selected", String(usersSelected));
  $("admin-orders-tab").setAttribute("aria-selected", String(!usersSelected));
  $("admin-users-panel").hidden = !usersSelected;
  $("admin-orders-panel").hidden = usersSelected;
  if (!usersSelected && !ordersLoaded)
    void loadOrders().catch(
      (error) => (ordersStatus.textContent = error.message),
    );
}

$("admin-users-tab").addEventListener("click", () => selectTab("users"));
$("admin-orders-tab").addEventListener("click", () => selectTab("orders"));

$("admin-search").addEventListener("submit", async (event) => {
  event.preventDefault();
  query = queryInput.value.trim();
  plan = planFilter.value;
  provider = providerFilter.value;
  page = 1;
  await loadUsers().catch((error) => (usersStatus.textContent = error.message));
});

previous.addEventListener("click", async () => {
  page -= 1;
  await loadUsers().catch((error) => (usersStatus.textContent = error.message));
});

next.addEventListener("click", async () => {
  page += 1;
  await loadUsers().catch((error) => (usersStatus.textContent = error.message));
});

$("admin-order-search").addEventListener("submit", async (event) => {
  event.preventDefault();
  orderQuery = orderQueryInput.value.trim();
  orderStatus = orderStatusFilter.value;
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

$("admin-drawer-close").addEventListener("click", () => drawer.close());
drawer.addEventListener("click", (event) => {
  if (event.target === drawer) drawer.close();
});

$("admin-drawer-plan-save").addEventListener("click", async () => {
  if (!selectedUser) return;
  const save = $("admin-drawer-plan-save");
  drawerPlan.disabled = true;
  save.disabled = true;
  drawerStatus.textContent = "正在保存方案……";
  try {
    await api(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/plan`, {
      method: "PUT",
      body: JSON.stringify({ plan: drawerPlan.value || null }),
    });
    const data = await api(
      `/api/admin/users?${new URLSearchParams({ q: selectedUser.email })}`,
    );
    selectedUser = data.users.find((user) => user.id === selectedUser.id);
    if (selectedUser) renderUserDetails(selectedUser);
    drawerStatus.textContent = "方案已更新。";
    await loadUsers();
  } catch (error) {
    drawerStatus.textContent = error.message;
  } finally {
    drawerPlan.disabled = false;
    save.disabled = false;
  }
});

$("admin-refresh").addEventListener("click", async () => {
  try {
    renderStats(await api("/api/admin/stats"));
    if ($("admin-users-tab").getAttribute("aria-selected") === "true")
      await loadUsers();
    else await loadOrders();
  } catch (error) {
    usersStatus.textContent = error.message;
    ordersStatus.textContent = error.message;
  }
});

for (const button of document.querySelectorAll("[data-auth-provider]")) {
  button.addEventListener("click", async () => {
    const providerName =
      button.dataset.authProvider === "microsoft" ? "Microsoft" : "Google";
    const status = $("admin-login-status");
    button.disabled = true;
    status.textContent = `正在打开 ${providerName} 登录……`;
    try {
      const config = await api("/api/config");
      const providerId = button.dataset.authProvider;
      if (!config[`${providerId}AuthConfigured`])
        throw new Error(`${providerName} 登录尚未配置。`);
      const result = await api("/api/auth/sign-in/social", {
        method: "POST",
        body: JSON.stringify({ provider: providerId, callbackURL: "/admin" }),
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
