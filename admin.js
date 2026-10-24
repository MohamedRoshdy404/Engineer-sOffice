(() => {
  const loginPanel = document.getElementById("login-panel");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const adminMessage = document.getElementById("admin-message");
  const categoryForm = document.getElementById("category-form");
  const categoryName = document.getElementById("category-name");
  const serviceForm = document.getElementById("service-form");
  const serviceId = document.getElementById("service-id");
  const serviceCategory = document.getElementById("service-category");
  const serviceName = document.getElementById("service-name");
  const partnerPrice = document.getElementById("partner-price");
  const regularPrice = document.getElementById("regular-price");
  const serviceFormTitle = document.getElementById("service-form-title");
  const serviceList = document.getElementById("admin-services");
  const serviceCount = document.getElementById("admin-service-count");
  const cancelEdit = document.getElementById("cancel-edit-button");
  const saveServiceButton = document.getElementById("save-service-button");
  const config = window.APP_CONFIG;
  let client;
  let categories = [];
  let services = [];

  function setMessage(element, text, kind = "") {
    element.dataset.kind = kind;
    element.textContent = text;
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(Number(value));
  }

  function setBusy(button, busy) {
    button.disabled = busy;
    if (busy) button.dataset.originalText = button.textContent;
    button.textContent = busy ? "جارٍ الحفظ..." : (button.dataset.originalText || button.textContent);
    if (!busy) delete button.dataset.originalText;
  }

  function showDashboard(visible) {
    loginPanel.hidden = visible;
    dashboard.hidden = !visible;
  }

  function renderCategories() {
    const selected = serviceCategory.value;
    serviceCategory.replaceChildren();
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      serviceCategory.append(option);
    });
    if (categories.some((category) => category.id === selected)) serviceCategory.value = selected;
    serviceCategory.disabled = categories.length === 0;
    saveServiceButton.disabled = categories.length === 0;
  }

  function renderServices() {
    serviceList.replaceChildren();
    serviceCount.textContent = formatPrice(services.length);
    if (!services.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "لا توجد خدمات بعد. أضف قسمًا ثم أضف أول خدمة.";
      serviceList.append(empty);
      return;
    }

    services.forEach((service) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const main = document.createElement("div");
      main.className = "admin-row-main";
      const title = document.createElement("span");
      title.className = "admin-row-title";
      title.textContent = service.name;
      const category = categories.find((item) => item.id === service.category_id);
      const meta = document.createElement("span");
      meta.className = "admin-row-meta";
      meta.textContent = `${category ? category.name : "بدون قسم"} · شريك ${formatPrice(service.partner_price)} ر.س · أساسي ${formatPrice(service.regular_price)} ر.س`;
      main.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "admin-row-actions";
      const edit = document.createElement("button");
      edit.className = "button button-edit";
      edit.type = "button";
      edit.textContent = "تعديل";
      edit.addEventListener("click", () => startEdit(service));
      const remove = document.createElement("button");
      remove.className = "button button-danger";
      remove.type = "button";
      remove.textContent = "حذف";
      remove.addEventListener("click", () => deleteService(service));
      actions.append(edit, remove);
      row.append(main, actions);
      serviceList.append(row);
    });
  }

  async function refreshData() {
    setMessage(adminMessage, "جاري تحميل البيانات...");
    const adminResult = await client.from("admin_users").select("user_id").maybeSingle();
    if (adminResult.error) throw adminResult.error;
    if (!adminResult.data) {
      throw new Error("هذا الحساب غير مضاف كأدمن. اطلب من مالك المشروع إضافته إلى قائمة الأدمن في Supabase.");
    }
    const [categoryResult, serviceResult] = await Promise.all([
      client.from("categories").select("id, name, sort_order").order("sort_order").order("name"),
      client.from("services").select("id, category_id, name, partner_price, regular_price").order("name")
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (serviceResult.error) throw serviceResult.error;
    categories = categoryResult.data;
    services = serviceResult.data;
    renderCategories();
    renderServices();
    setMessage(adminMessage, "");
  }

  function startEdit(service) {
    serviceId.value = service.id;
    serviceCategory.value = service.category_id;
    serviceName.value = service.name;
    partnerPrice.value = service.partner_price;
    regularPrice.value = service.regular_price;
    serviceFormTitle.textContent = "تعديل الخدمة";
    saveServiceButton.textContent = "حفظ التعديلات";
    cancelEdit.hidden = false;
    serviceForm.scrollIntoView({ behavior: "smooth", block: "center" });
    serviceName.focus();
  }

  function resetServiceForm() {
    serviceForm.reset();
    serviceId.value = "";
    serviceFormTitle.textContent = "إضافة خدمة";
    saveServiceButton.textContent = "حفظ الخدمة";
    cancelEdit.hidden = true;
  }

  async function deleteService(service) {
    if (!window.confirm(`هل تريد حذف خدمة "${service.name}"؟`)) return;
    setMessage(adminMessage, "جاري حذف الخدمة...");
    const { error } = await client.from("services").delete().eq("id", service.id);
    if (error) {
      setMessage(adminMessage, `تعذر حذف الخدمة: ${error.message}`, "error");
      return;
    }
    setMessage(adminMessage, "تم حذف الخدمة.", "success");
    try {
      await refreshData();
      setMessage(adminMessage, "تم حذف الخدمة.", "success");
    } catch (error) {
      setMessage(adminMessage, `تم حذف الخدمة، لكن تعذر تحديث القائمة: ${error.message}`, "error");
    }
  }

  async function showAuthenticatedSession(session) {
    if (!session) {
      showDashboard(false);
      return;
    }
    showDashboard(true);
    try {
      await refreshData();
    } catch (error) {
      setMessage(adminMessage, `تعذر تحميل لوحة الإدارة: ${error.message}`, "error");
    }
  }

  if (!config || !config.supabaseUrl || !config.supabaseAnonKey ||
      config.supabaseUrl.startsWith("YOUR_") || config.supabaseAnonKey.startsWith("YOUR_")) {
    setMessage(loginMessage, "أكمل إعداد رابط ومفتاح Supabase في ملف config.js أولًا.", "error");
    loginForm.querySelector("button").disabled = true;
    return;
  }
  if (!window.supabase) {
    setMessage(loginMessage, "تعذر تحميل مكتبة الاتصال. تحقق من اتصال الإنترنت ثم أعد المحاولة.", "error");
    loginForm.querySelector("button").disabled = true;
    return;
  }

  client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button");
    setBusy(button, true);
    setMessage(loginMessage, "");
    const { data, error } = await client.auth.signInWithPassword({
      email: document.getElementById("login-email").value.trim(),
      password: document.getElementById("login-password").value
    });
    setBusy(button, false);
    if (error) {
      setMessage(loginMessage, `تعذر تسجيل الدخول: ${error.message}`, "error");
      return;
    }
    await showAuthenticatedSession(data.session);
  });

  document.getElementById("logout-button").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) {
      setMessage(adminMessage, `تعذر تسجيل الخروج: ${error.message}`, "error");
      return;
    }
    resetServiceForm();
    showDashboard(false);
    setMessage(loginMessage, "تم تسجيل الخروج.", "success");
  });

  categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = categoryForm.querySelector("button");
    setBusy(button, true);
    setMessage(adminMessage, "");
    const { error } = await client.from("categories").insert({ name: categoryName.value.trim() });
    setBusy(button, false);
    if (error) {
      setMessage(adminMessage, `تعذرت إضافة القسم: ${error.message}`, "error");
      return;
    }
    categoryForm.reset();
    try {
      await refreshData();
      setMessage(adminMessage, "تمت إضافة القسم.", "success");
    } catch (refreshError) {
      setMessage(adminMessage, `تمت إضافة القسم، لكن تعذر تحديث القائمة: ${refreshError.message}`, "error");
    }
  });

  serviceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!categories.length) {
      setMessage(adminMessage, "أضف قسمًا قبل إضافة خدمة.", "error");
      return;
    }
    setBusy(saveServiceButton, true);
    setMessage(adminMessage, "");
    const values = {
      category_id: serviceCategory.value,
      name: serviceName.value.trim(),
      partner_price: Number(partnerPrice.value),
      regular_price: Number(regularPrice.value)
    };
    const request = serviceId.value
      ? client.from("services").update(values).eq("id", serviceId.value)
      : client.from("services").insert(values);
    const { error } = await request;
    setBusy(saveServiceButton, false);
    if (error) {
      setMessage(adminMessage, `تعذر حفظ الخدمة: ${error.message}`, "error");
      return;
    }
    resetServiceForm();
    try {
      await refreshData();
      setMessage(adminMessage, "تم حفظ الخدمة.", "success");
    } catch (refreshError) {
      setMessage(adminMessage, `تم حفظ الخدمة، لكن تعذر تحديث القائمة: ${refreshError.message}`, "error");
    }
  });

  cancelEdit.addEventListener("click", resetServiceForm);
  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      setMessage(loginMessage, `تعذر استعادة جلسة الدخول: ${error.message}`, "error");
      return;
    }
    showAuthenticatedSession(data.session);
  });
  client.auth.onAuthStateChange((_event, session) => {
    if (!session) showDashboard(false);
  });
})();
