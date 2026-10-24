(() => {
  const searchInput = document.getElementById("service-search");
  const catalog = document.getElementById("catalog");
  const status = document.getElementById("catalog-status");
  const count = document.getElementById("catalog-count");
  const year = document.getElementById("current-year");
  const priceFormatter = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 });
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
  let searchIndex = [];
  let renderFrame = 0;

  function formatPrice(value) {
    return priceFormatter.format(Number(value));
  }

  function normalizeSearchText(value) {
    return value.normalize("NFKC")
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .toLocaleLowerCase("ar")
      .trim()
      .replace(/\s+/g, " ");
  }

  function render() {
    const query = normalizeSearchText(searchInput.value);
    const groups = new Map();
    let resultCount = 0;

    for (const item of searchIndex) {
      if (!item.searchText.includes(query)) continue;
      let group = groups.get(item.service.category_id);
      if (!group) {
        group = [];
        groups.set(item.service.category_id, group);
      }
      group.push(item.service);
      resultCount += 1;
    }

    count.textContent = `عدد الخدمات: ${formatPrice(resultCount)}`;
    const content = document.createDocumentFragment();

    if (resultCount === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = query ? "لا توجد خدمات تطابق بحثك." : "لا توجد خدمات مضافة حاليًا.";
      content.append(empty);
      catalog.replaceChildren(content);
      return;
    }

    categories.forEach((category, index) => {
      const items = groups.get(category.id);
      if (!items || items.length === 0) return;

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
        prices.className = service.price_note ? "prices quote-price" : "prices";
        if (service.price_note) {
          prices.textContent = service.price_note;
        } else {
          const partner = document.createElement("strong");
          partner.className = "partner-price";
          partner.textContent = `${formatPrice(service.partner_price)} ر.س`;
          const regular = document.createElement("span");
          regular.className = "regular-price";
          regular.textContent = `${formatPrice(service.regular_price)} ر.س`;
          prices.append(partner, regular);
        }
        row.append(name, prices);
        list.append(row);
      });
      card.append(heading, list);
      content.append(card);
    });
    catalog.replaceChildren(content);
  }

  function scheduleRender() {
    if (renderFrame) return;
    renderFrame = window.requestAnimationFrame(() => {
      renderFrame = 0;
      render();
    });
  }

  async function loadCatalog() {
    status.dataset.kind = "";
    status.textContent = "جاري تحميل قائمة الخدمات...";
    const [categoryResult, serviceResult] = await Promise.all([
      client.from("categories").select("id, name, sort_order").order("sort_order").order("name"),
      client.from("services").select("id, category_id, name, partner_price, regular_price, price_note").order("name")
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (serviceResult.error) throw serviceResult.error;
    categories = categoryResult.data;
    services = serviceResult.data;
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
    searchIndex = services.map((service) => ({
      service,
      searchText: normalizeSearchText(
        `${service.name} ${categoryNames.get(service.category_id) || ""}`
      )
    }));
    status.textContent = "";
    render();
  }

  searchInput.addEventListener("input", scheduleRender);
  loadCatalog().catch((error) => {
    status.dataset.kind = "error";
    status.textContent = `تعذر تحميل الأسعار: ${error.message}`;
    count.textContent = "";
  });
})();
