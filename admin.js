(() => {
  const loginPanel = document.getElementById("login-panel");
  const dashboard = document.getElementById("dashboard");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const adminMessage = document.getElementById("admin-message");
  const categoryForm = document.getElementById("category-form");
  const categoryId = document.getElementById("category-id");
  const categoryName = document.getElementById("category-name");
  const categoryFormTitle = document.getElementById("category-form-title");
  const categoryList = document.getElementById("admin-categories");
  const categoryCount = document.getElementById("admin-category-count");
  const saveCategoryButton = document.getElementById("save-category-button");
  const cancelCategoryEdit = document.getElementById("cancel-category-edit-button");
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
  const priceFormatter = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 });
  let client;
  let categories = [];
  let services = [];
  let categoriesById = new Map();

  function setMessage(element, text, kind = "") {
    element.dataset.kind = kind;
    element.textContent = text;
  }

  function formatPrice(value) {
    return priceFormatter.format(Number(value));
  }

  function setBusy(button, busy) {
    button.disabled = busy;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = "جارٍ الحفظ...";
    } else {
      if (button.textContent === "جارٍ الحفظ..." && button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
      delete button.dataset.originalText;
    }
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
    renderCategoryList();
  }

  function renderCategoryList() {
    categoryList.replaceChildren();
    categoryCount.textContent = formatPrice(categories.length);
    if (!categories.length) {
      const empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "لا توجد أقسام بعد.";
      categoryList.append(empty);
      return;
    }

    const serviceCounts = new Map();
    services.forEach((service) => {
      serviceCounts.set(service.category_id, (serviceCounts.get(service.category_id) || 0) + 1);
    });

    categories.forEach((category) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const main = document.createElement("div");
      main.className = "admin-row-main";
      const title = document.createElement("span");
      title.className = "admin-row-title";
      title.textContent = category.name;
      const itemCount = serviceCounts.get(category.id) || 0;
      const meta = document.createElement("span");
      meta.className = "admin-row-meta";
      meta.textContent = `${formatPrice(itemCount)} خدمات`;
      main.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "admin-row-actions";
      const edit = document.createElement("button");
      edit.className = "button button-edit";
      edit.type = "button";
      edit.textContent = "تعديل";
      edit.addEventListener("click", () => startCategoryEdit(category));
      const remove = document.createElement("button");
      remove.className = "button button-danger";
      remove.type = "button";
      remove.textContent = "حذف";
      remove.addEventListener("click", () => deleteCategory(category, remove));
      actions.append(edit, remove);
      row.append(main, actions);
      categoryList.append(row);
    });
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
      const category = categoriesById.get(service.category_id);
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
      remove.addEventListener("click", () => deleteService(service, remove));
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
      showDashboard(false);
      setMessage(loginMessage, "هذا الحساب غير مضاف كأدمن. اطلب من مالك المشروع إضافته إلى قائمة الأدمن في Supabase.", "error");
      return false;
    }
    const [categoryResult, serviceResult] = await Promise.all([
      client.from("categories").select("id, name, sort_order").order("sort_order").order("name"),
      client.from("services").select("id, category_id, name, partner_price, regular_price").order("name")
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (serviceResult.error) throw serviceResult.error;
    categories = categoryResult.data;
    services = serviceResult.data;
    categoriesById = new Map(categories.map((category) => [category.id, category]));
    renderCategories();
    renderServices();
    setMessage(adminMessage, "");
    return true;
  }

  function startCategoryEdit(category) {
    categoryId.value = category.id;
    categoryName.value = category.name;
    categoryFormTitle.textContent = "تعديل القسم";
    saveCategoryButton.textContent = "حفظ التعديلات";
    cancelCategoryEdit.hidden = false;
    categoryForm.scrollIntoView({ behavior: "smooth", block: "center" });
    categoryName.focus();
  }

  function resetCategoryForm() {
    categoryForm.reset();
    categoryId.value = "";
    categoryFormTitle.textContent = "إضافة قسم";
    saveCategoryButton.textContent = "إضافة القسم";
    cancelCategoryEdit.hidden = true;
  }

  async function deleteCategory(category, button) {
    const itemCount = services.filter((service) => service.category_id === category.id).length;
    const servicesWarning = itemCount
      ? ` وسيتم حذف ${formatPrice(itemCount)} خدمات مرتبطة به أيضًا.`
      : "";
    if (!window.confirm(`هل تريد حذف قسم "${category.name}"؟${servicesWarning}`)) return;

    setBusy(button, true);
    setMessage(adminMessage, "جاري حذف القسم...");
    try {
      const { error } = await client.from("categories").delete().eq("id", category.id);
      if (error) {
        setMessage(adminMessage, `تعذر حذف القسم: ${error.message}`, "error");
        return;
      }

      if (categoryId.value === category.id) resetCategoryForm();
      if (services.some((service) => service.category_id === category.id &&
          serviceId.value === service.id)) resetServiceForm();
      try {
        if (!(await refreshData())) return;
        setMessage(adminMessage, "تم حذف القسم والخدمات المرتبطة به.", "success");
      } catch (error) {
        setMessage(adminMessage, `تم حذف القسم، لكن تعذر تحديث القائمة: ${error.message}`, "error");
      }
    } catch (error) {
      setMessage(adminMessage, `تعذر حذف القسم: ${error.message}`, "error");
    } finally {
      setBusy(button, false);
    }
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

  async function deleteService(service, button) {
    if (!window.confirm(`هل تريد حذف خدمة "${service.name}"؟`)) return;
    setMessage(adminMessage, "جاري حذف الخدمة...");
    setBusy(button, true);
    try {
      const { error } = await client.from("services").delete().eq("id", service.id);
      if (error) {
        setMessage(adminMessage, `تعذر حذف الخدمة: ${error.message}`, "error");
        return;
      }
      try {
        if (!(await refreshData())) return;
        setMessage(adminMessage, "تم حذف الخدمة.", "success");
      } catch (error) {
        setMessage(adminMessage, `تم حذف الخدمة، لكن تعذر تحديث القائمة: ${error.message}`, "error");
      }
    } catch (error) {
      setMessage(adminMessage, `تعذر حذف الخدمة: ${error.message}`, "error");
    } finally {
      setBusy(button, false);
    }
  }

  async function showAuthenticatedSession(session) {
    if (!session) {
      showDashboard(false);
      return;
    }
    showDashboard(false);
    setMessage(loginMessage, "جارٍ التحقق من صلاحيات الحساب...");
    try {
      if (!(await refreshData())) return;
      setMessage(loginMessage, "");
      showDashboard(true);
    } catch (error) {
      setMessage(loginMessage, `تعذر التحقق من صلاحيات الإدارة: ${error.message}`, "error");
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
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: document.getElementById("login-email").value.trim(),
        password: document.getElementById("login-password").value
      });
      if (error) {
        setMessage(loginMessage, `تعذر تسجيل الدخول: ${error.message}`, "error");
        return;
      }
      await showAuthenticatedSession(data.session);
    } catch (error) {
      setMessage(loginMessage, `تعذر تسجيل الدخول: ${error.message}`, "error");
    } finally {
      setBusy(button, false);
    }
  });

  document.getElementById("logout-button").addEventListener("click", async () => {
    try {
      const { error } = await client.auth.signOut();
      if (error) {
        setMessage(adminMessage, `تعذر تسجيل الخروج: ${error.message}`, "error");
        return;
      }
      resetServiceForm();
      resetCategoryForm();
      showDashboard(false);
      setMessage(loginMessage, "تم تسجيل الخروج.", "success");
    } catch (error) {
      setMessage(adminMessage, `تعذر تسجيل الخروج: ${error.message}`, "error");
    }
  });

  categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(saveCategoryButton, true);
    setMessage(adminMessage, "");
    try {
      const wasEditing = Boolean(categoryId.value);
      const request = wasEditing
        ? client.from("categories").update({ name: categoryName.value.trim() }).eq("id", categoryId.value)
        : client.from("categories").insert({ name: categoryName.value.trim() });
      const { error } = await request;
      if (error) {
        setMessage(adminMessage, `تعذر حفظ القسم: ${error.message}`, "error");
        return;
      }
      resetCategoryForm();
      try {
        if (!(await refreshData())) return;
        setMessage(adminMessage, wasEditing ? "تم تعديل القسم." : "تمت إضافة القسم.", "success");
      } catch (refreshError) {
        const action = wasEditing ? "تعديل القسم" : "إضافة القسم";
        setMessage(adminMessage, `تم ${action}، لكن تعذر تحديث القائمة: ${refreshError.message}`, "error");
      }
    } catch (error) {
      setMessage(adminMessage, `تعذر حفظ القسم: ${error.message}`, "error");
    } finally {
      setBusy(saveCategoryButton, false);
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
    try {
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
      if (error) {
        setMessage(adminMessage, `تعذر حفظ الخدمة: ${error.message}`, "error");
        return;
      }
      resetServiceForm();
      try {
        if (!(await refreshData())) return;
        setMessage(adminMessage, "تم حفظ الخدمة.", "success");
      } catch (refreshError) {
        setMessage(adminMessage, `تم حفظ الخدمة، لكن تعذر تحديث القائمة: ${refreshError.message}`, "error");
      }
    } catch (error) {
      setMessage(adminMessage, `تعذر حفظ الخدمة: ${error.message}`, "error");
    } finally {
      setBusy(saveServiceButton, false);
    }
  });

  cancelCategoryEdit.addEventListener("click", resetCategoryForm);
  cancelEdit.addEventListener("click", resetServiceForm);
  client.auth.getSession().then(({ data, error }) => {
    if (error) {
      setMessage(loginMessage, `تعذر استعادة جلسة الدخول: ${error.message}`, "error");
      return;
    }
    showAuthenticatedSession(data.session);
  }).catch((error) => {
    setMessage(loginMessage, `تعذر استعادة جلسة الدخول: ${error.message}`, "error");
  });
  client.auth.onAuthStateChange((_event, session) => {
    if (!session) showDashboard(false);
  });
})();
