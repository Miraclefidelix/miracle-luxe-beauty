(() => {
  const config = window.SHOP_CONFIG || {};
  let products = Array.isArray(window.SHOP_PRODUCTS)
    ? window.SHOP_PRODUCTS
    : [];

  const shopName = config.name || "My Beauty Shop";
  const number = String(config.whatsappNumber || "").replace(/\D/g, "");
  const currency = config.currency || "₦";

  function waLink(message) {
    if (!number) return "#";
    return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
  }

  function generalMessage() {
    return (config.whatsappGreeting || "Hello! I have a question about your products.") +
      "\n\nShop: " + shopName;
  }

  function formatPrice(price) {
    const n = Number(price);
    if (!Number.isFinite(n)) return "Ask for price";
    return currency + n.toLocaleString("en-NG");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  document.title = shopName + " | Beauty & Fragrance";

  ["brand-name", "footer-brand-name", "copyright-name"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = shopName;
  });

  const heroDesc = document.getElementById("hero-description");
  if (heroDesc && config.heroDescription) {
    heroDesc.textContent = config.heroDescription;
  }

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  [
    "nav-whatsapp",
    "hero-whatsapp",
    "all-whatsapp",
    "about-whatsapp",
    "footer-whatsapp",
    "floating-whatsapp"
  ].forEach(id => {
    const el = document.getElementById(id);

    if (el) {
      el.href = waLink(generalMessage());
      el.target = "_blank";
      el.rel = "noopener noreferrer";
    }
  });

  const grid = document.getElementById("product-grid");

  function renderProducts(filter = "All") {
    if (!grid) return;

    const visible = products.filter(p =>
      filter === "All" || p.category === filter
    );

    if (!visible.length) {
      grid.innerHTML =
        '<p class="empty-state">No products in this category yet. Please check back soon.</p>';
      return;
    }

    grid.innerHTML = visible.map(p => {
      const message =
        (config.whatsappGreeting || "Hello! I'm interested in this product.") +
        "\n\nShop: " + shopName +
        "\nProduct: " + p.name +
        "\nPrice: " + formatPrice(p.price) +
        "\n\nIs this available? Please tell me about delivery.";

      const url = waLink(message);
      const image = p.image || "";

      return `<article class="product-card">
        <div class="product-image-wrap">
          <img class="product-image"
            src="${escapeHtml(image)}"
            alt="${escapeHtml(p.name)}"
            loading="lazy"
            onerror="this.onerror=null;this.src='https://placehold.co/700x700/f3dbe8/44234d?text=Add+Product+Photo'">

          <span class="product-badge">
            ${escapeHtml(p.badge || "JUST FOR YOU")}
          </span>
        </div>

        <div class="product-info">
          <span class="product-category">
            ${escapeHtml(
              p.category === "Perfume"
                ? "Perfumes"
                : p.category === "Beauty"
                ? "Beauty & cosmetics"
                : p.category || "Collection"
            )}
          </span>

          <h3>${escapeHtml(p.name)}</h3>

          <p class="product-description">
            ${escapeHtml(p.description || "")}
          </p>

          <div class="product-bottom">
            <span class="product-price">${formatPrice(p.price)}</span>

            <a class="order-button"
              href="${escapeHtml(url)}"
              target="_blank"
              rel="noopener noreferrer">
              Order on WhatsApp ↗
            </a>
          </div>
        </div>
      </article>`;
    }).join("");
  }

  // PRODUCT CATEGORY FILTERS

  document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(b =>
        b.classList.remove("active")
      );

      button.classList.add("active");

      renderProducts(button.dataset.filter || "All");
    });
  });

  // MOBILE NAVIGATION

  const menuToggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("main-nav");

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");

      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute(
        "aria-label",
        open ? "Close navigation" : "Open navigation"
      );
    });

    nav.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // LOAD PRODUCTS FROM SUPABASE

  async function loadProducts() {
    // Display existing products while Supabase loads.
    renderProducts();

    if (!window.supabaseClient) {
      console.warn("Supabase is unavailable. Using local products.");
      return;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Only replace local products when Supabase returns products.
      if (data && data.length > 0) {
        products = data.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          description: p.description,
          image: p.image_url,
          badge: "JUST FOR YOU"
        }));

        renderProducts();
      }

    } catch (error) {
      console.error("Could not load Supabase products:", error);
      console.log("Using local products as fallback.");
    }
  }

  loadProducts();

})();
