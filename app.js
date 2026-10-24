(() => {
  const searchInput = document.getElementById("service-search");
  const catalog = document.getElementById("catalog");
  const status = document.getElementById("catalog-status");
  const count = document.getElementById("catalog-count");
  const year = document.getElementById("current-year");
  year.textContent = new Date().getFullYear();

  const config = window.APP_CONFIG;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey ||
      config.supabaseUrl.startsWith("YOUR_") || config.supabaseAnonKey.startsWith("YOUR_")) {
    status.dataset.kind = "error";
    status.textContent = "أكمل إعداد رابط ومفتاح Supabase في ملف config.js لعرض الأسعار.";
    return;
  }
  if (!window.supabase) {
    status.dataset.kind = "error";
    status.textContent = "تعذر تحميل مكتبة الاتصال. تحقق من اتصال الإنترنت ثم أعد المحاولة.";
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  let categories = [];
  let services = [];

  function formatPrice(value) {
    return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(Number(value));
  }

  function render() {
    const query = searchInput.value.trim().toLocaleLowerCase("ar");
    const filtered = services.filter((service) => {
      const category = categories.find((item) => item.id === service.category_id);
      return `${service.name} ${category ? category.name : ""}`.toLocaleLowerCase("ar").includes(query);
    });
    count.textContent = `عدد الخدمات: ${formatPrice(filtered.length)}`;
    catalog.replaceChildren();

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = query ? "لا توجد خدمات تطابق بحثك." : "لا توجد خدمات مضافة حاليًا.";
      catalog.append(empty);
      return;
    }

    categories.forEach((category, index) => {
      const items = filtered.filter((service) => service.category_id === category.id);
      if (!items.length) return;

      const card = document.createElement("section");
      card.className = "category-card";
      const heading = document.createElement("div");
      heading.className = "category-heading";
      const icon = document.createElement("span");
      icon.className = "category-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("h2");
      title.textContent = category.name;
      const categoryCount = document.createElement("span");
      categoryCount.textContent = `${formatPrice(items.length)} خدمات`;
      heading.append(icon, title, categoryCount);

      const list = document.createElement("div");
      list.className = "service-list";
      items.forEach((service) => {
        const row = document.createElement("div");
        row.className = "service-row";
        const name = document.createElement("span");
        name.className = "service-name";
        name.textContent = service.name;
        const prices = document.createElement("span");
        prices.className = "prices";
        const partner = document.createElement("strong");
        partner.className = "partner-price";
        partner.textContent = `${formatPrice(service.partner_price)} ر.س`;
        const regular = document.createElement("span");
        regular.className = "regular-price";
        regular.textContent = `${formatPrice(service.regular_price)} ر.س`;
        prices.append(partner, regular);
        row.append(name, prices);
        list.append(row);
      });
      card.append(heading, list);
      catalog.append(card);
    });
  }

  async function loadCatalog() {
    status.dataset.kind = "";
    status.textContent = "جاري تحميل قائمة الخدمات...";
    const [categoryResult, serviceResult] = await Promise.all([
      client.from("categories").select("id, name, sort_order").order("sort_order").order("name"),
      client.from("services").select("id, category_id, name, partner_price, regular_price").order("name")
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (serviceResult.error) throw serviceResult.error;
    categories = categoryResult.data;
    services = serviceResult.data;
    status.textContent = "";
    render();
  }

  searchInput.addEventListener("input", render);
  loadCatalog().catch((error) => {
    status.dataset.kind = "error";
    status.textContent = `تعذر تحميل الأسعار: ${error.message}`;
    count.textContent = "";
  });
})();
