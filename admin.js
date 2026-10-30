const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const loginButton = document.getElementById("login-button");

const logoutButton = document.getElementById("logout-button");

const productForm = document.getElementById("product-form");
const productMessage = document.getElementById("product-message");
const productsList = document.getElementById("products-list");
const ordersList = document.getElementById("orders-list");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatMoney(amount, currency = "NGN") {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency === "₦" ? "NGN" : currency
    }).format(Number(amount) || 0);
}

async function verifyAdmin() {
    const { data, error } = await supabaseClient.rpc("is_admin");

    if (error) throw error;

    if (!data) {
        await supabaseClient.auth.signOut();
        throw new Error("You are not authorised as an administrator.");
    }

    return true;
}

function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
}

function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    loadProducts();
    loadOrders();
}

// ADMIN LOGIN

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
    loginMessage.textContent = "";

    try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        await verifyAdmin();

        loginMessage.textContent = "Login successful!";
        loginMessage.style.color = "green";

        showDashboard();

    } catch (error) {
        loginMessage.textContent = error.message;
        loginMessage.style.color = "red";
    }

    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
});

// LOGOUT

logoutButton.addEventListener("click", async function () {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert(error.message);
        return;
    }

    showLogin();
});

// CHECK EXISTING SESSION

async function checkSession() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        if (data.session) {
            await verifyAdmin();
            showDashboard();
        } else {
            showLogin();
        }

    } catch (error) {
        showLogin();
        loginMessage.textContent = error.message;
        loginMessage.style.color = "red";
    }
}

// ADD PRODUCT AND UPLOAD IMAGE

productForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const button = document.getElementById("save-product-button");
    const imageFile = document.getElementById("product-image").files[0];

    if (!imageFile) {
        productMessage.textContent = "Please select a product picture.";
        return;
    }

    if (!imageFile.type.startsWith("image/")) {
        productMessage.textContent = "Please select a valid image.";
        return;
    }

    if (imageFile.size > 5 * 1024 * 1024) {
        productMessage.textContent = "Image must be smaller than 5 MB.";
        return;
    }

    button.disabled = true;
    button.textContent = "Uploading...";
    productMessage.textContent = "";

    try {
        await verifyAdmin();

        const fileName =
            Date.now() + "-" + imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");

        const { error: uploadError } = await supabaseClient.storage
            .from("product-images")
            .upload(fileName, imageFile, {
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: imageData } = supabaseClient.storage
            .from("product-images")
            .getPublicUrl(fileName);

        const product = {
            name: document.getElementById("product-name").value.trim(),
            category: document.getElementById("product-category").value,
            price: Number(document.getElementById("product-price").value),
            description: document.getElementById("product-description").value.trim(),
            image_url: imageData.publicUrl,
            active: true,
            currency: "NGN"
        };

        const { error: insertError } = await supabaseClient
            .from("products")
            .insert([product]);

        if (insertError) throw insertError;

        productMessage.textContent = "Product added successfully!";
        productMessage.style.color = "green";

        productForm.reset();
        loadProducts();

    } catch (error) {
        productMessage.textContent = error.message;
        productMessage.style.color = "red";
    }

    button.disabled = false;
    button.textContent = "Add Product";
});

// LOAD PRODUCTS

async function loadProducts() {
    productsList.textContent = "Loading products...";

    try {
        await verifyAdmin();

        const { data, error } = await supabaseClient
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data.length) {
            productsList.textContent = "No products have been added yet.";
            return;
        }

        productsList.innerHTML = data.map(product => `
            <div class="admin-product">
                <img
                    src="${escapeHTML(product.image_url)}"
                    alt="${escapeHTML(product.name)}"
                    style="width:90px;height:90px;object-fit:cover;border-radius:8px;"
                >

                <h3>${escapeHTML(product.name)}</h3>
                <p>${formatMoney(product.price, product.currency)}</p>
                <p>${escapeHTML(product.category)}</p>
                <p>${product.active ? "Active" : "Hidden"}</p>

                <button onclick="editProduct(${Number(product.id)})">
                    Edit
                </button>

                <button onclick="toggleProduct(${Number(product.id)}, ${product.active})">
                    ${product.active ? "Hide" : "Show"}
                </button>

                <button onclick="deleteProduct(${Number(product.id)})">
                    Delete
                </button>
                <hr>
            </div>
        `).join("");

    } catch (error) {
        productsList.textContent = error.message;
    }
}

// EDIT PRODUCT

async function editProduct(id) {
    try {
        await verifyAdmin();

        const { data: product, error } = await supabaseClient
            .from("products")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        const name = prompt("Product name:", product.name);
        if (name === null) return;

        const price = prompt("Product price in Naira:", product.price);
        if (price === null) return;

        const description = prompt("Product description:", product.description || "");
        if (description === null) return;

        const category = prompt("Category (Beauty or Perfume):", product.category);
        if (category === null) return;

        if (!name.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) {
            alert("Please enter a valid name and price.");
            return;
        }

        if (!["Beauty", "Perfume"].includes(category.trim())) {
            alert("Category must be Beauty or Perfume.");
            return;
        }

        const { error: updateError } = await supabaseClient
            .from("products")
            .update({
                name: name.trim(),
                price: Number(price),
                description: description.trim(),
                category: category.trim()
            })
            .eq("id", id);

        if (updateError) throw updateError;

        alert("Product updated successfully!");
        loadProducts();

    } catch (error) {
        alert(error.message);
    }
}

// HIDE OR SHOW PRODUCT

async function toggleProduct(id, currentStatus) {
    try {
        await verifyAdmin();

        const { error } = await supabaseClient
            .from("products")
            .update({ active: !currentStatus })
            .eq("id", id);

        if (error) throw error;

        loadProducts();

    } catch (error) {
        alert(error.message);
    }
}

// DELETE PRODUCT

async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        await verifyAdmin();

        const { error } = await supabaseClient
            .from("products")
            .delete()
            .eq("id", id);

        if (error) throw error;

        alert("Product deleted successfully!");
        loadProducts();

    } catch (error) {
        alert(error.message);
    }
}

// LOAD CUSTOMER ORDERS

async function loadOrders() {
    ordersList.textContent = "Loading orders...";

    try {
        await verifyAdmin();

        const { data, error } = await supabaseClient
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data.length) {
            ordersList.textContent = "No customer orders yet.";
            return;
        }

        ordersList.innerHTML = data.map(order => `
            <div class="admin-order">
                <h3>Order #${escapeHTML(order.id)}</h3>
                <p>Customer: ${escapeHTML(order.customer_name)}</p>
                <p>Phone: ${escapeHTML(order.phone)}</p>
                <p>Total: ${formatMoney(order.total, order.currency)}</p>
                <p>Status: ${escapeHTML(order.status)}</p>
                <p>Date: ${escapeHTML(new Date(order.created_at).toLocaleString())}</p>
                <pre>${escapeHTML(JSON.stringify(order.items, null, 2))}</pre>
                <button onclick="updateOrderStatus(${Number(order.id)})">
                    Update Status
                </button>
                <hr>
            </div>
        `).join("");

    } catch (error) {
        ordersList.textContent = error.message;
    }
}

// UPDATE ORDER STATUS

async function updateOrderStatus(id) {
    const status = prompt(
        "Enter order status: Pending, Processing, Completed or Cancelled"
    );

    if (status === null) return;

    const allowedStatuses = [
        "Pending",
        "Processing",
        "Completed",
        "Cancelled"
    ];

    if (!allowedStatuses.includes(status.trim())) {
        alert("Please enter one of the listed statuses.");
        return;
    }

    try {
        await verifyAdmin();

        const { error } = await supabaseClient
            .from("orders")
            .update({ status: status.trim() })
            .eq("id", id);

        if (error) throw error;

        alert("Order status updated!");
        loadOrders();

    } catch (error) {
        alert(error.message);
    }
}

// START THE DASHBOARD

checkSession();
