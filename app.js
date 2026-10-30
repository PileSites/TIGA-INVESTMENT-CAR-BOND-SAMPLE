(function () {
  "use strict";

  const config = window.TIGA_CONFIG;
  const vehicles = window.TIGA_VEHICLES;
  const homeView = document.getElementById("home-view");
  const inventoryPage = document.querySelector(".inventory-page");
  const detailPage = document.getElementById("vehicle-detail");
  const aboutPage = document.getElementById("about-page");
  const servicesPage = document.getElementById("services");
  const contactPage = document.getElementById("contact");
  const inventoryGrid = document.getElementById("inventory-grid");
  const featuredGrid = document.getElementById("featured-grid");
  const filterPanel = document.getElementById("filter-panel");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12 })
    : null;
  function observeReveal(root, selector) {
    if (!revealObserver) return;
    root.querySelectorAll(selector).forEach((element, index) => {
      if (element.classList.contains("reveal")) return;
      element.classList.add("reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index, 4) * 70}ms`);
      revealObserver.observe(element);
    });
  }
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const interactionStatus = document.getElementById("interaction-status");
  const toast = document.getElementById("interaction-toast");
  let toastTimer;
  let storageAvailable = true;
  let savedIds = [];
  let comparedIds = new Set();
  let activeVehicle = null;
  let activeImageIndex = 0;
  try {
    savedIds = JSON.parse(localStorage.getItem("tiga-saved-vehicles") || "[]")
      .filter((id) => typeof id === "string" && vehicles.some((vehicle) => vehicle.id === id));
  } catch (error) {
    storageAvailable = false;
    console.warn("Saved vehicles could not be loaded from browser storage.", error);
  }
  function announce(message) {
    interactionStatus.textContent = message;
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }
  function persistSavedIds() {
    if (!storageAvailable) return false;
    try {
      localStorage.setItem("tiga-saved-vehicles", JSON.stringify(savedIds));
      return true;
    } catch (error) {
      storageAvailable = false;
      console.warn("Saved vehicles are available until this page is closed, but browser storage could not be updated.", error);
      return false;
    }
  }
  window.addEventListener("storage", (event) => {
    if (event.key !== "tiga-saved-vehicles" && event.key !== null) return;
    try {
      savedIds = JSON.parse(event.newValue || "[]")
        .filter((id) => typeof id === "string" && vehicles.some((vehicle) => vehicle.id === id));
      refreshVehicleInteractions();
      announce("Saved vehicles updated in another tab.");
    } catch (error) {
      console.warn("Saved vehicles changed in another tab but could not be read.", error);
    }
  });
  const groupedContacts = new Map();
  config.contacts.forEach((contact) => {
    const key = `${contact.label}|${contact.name || ""}`;
    if (!groupedContacts.has(key)) groupedContacts.set(key, { ...contact, numbers: [] });
    groupedContacts.get(key).numbers.push(contact);
  });
  document.getElementById("contact-details").innerHTML = [...groupedContacts.values()].map((contact) => `
    <div class="contact-group">
      <p class="eyebrow">${escapeHtml(contact.label)}</p>
      ${contact.name ? `<h2>${escapeHtml(contact.name)}</h2>` : ""}
      ${contact.numbers.map((number) => `<a href="tel:${escapeHtml(number.tel)}">${escapeHtml(number.phone)}${number.international ? ' <span class="international-tag">International</span>' : ""}</a>`).join("")}
      ${contact.label === "Uganda sales office / manager" ? '<a class="whatsapp-link" data-wa="sales" href="#">Message on WhatsApp ↗</a>' : ""}
    </div>`).join("") + document.getElementById("business-location").innerHTML;
  document.getElementById("footer-contacts").innerHTML = config.contacts
    .filter((contact) => contact.label === "Uganda sales office / manager")
    .map((contact) => `<a href="tel:${escapeHtml(contact.tel)}">${escapeHtml(contact.phone)}</a>`).join("");
  const businessSchema = document.getElementById("business-schema");
  const schemaData = JSON.parse(businessSchema.textContent);
  schemaData.telephone = config.contacts.map((contact) => contact.tel);
  schemaData.contactPoint = config.contacts.map((contact) => ({
    "@type": "ContactPoint",
    telephone: contact.tel,
    contactType: contact.label
  }));
  businessSchema.textContent = JSON.stringify(schemaData);
  const formatPrice = (vehicle) => new Intl.NumberFormat("en-UG", {
    style: "currency", currency: vehicle.currency || "UGX", maximumFractionDigits: 0
  }).format(vehicle.price);
  const formatMileage = (value) => `${new Intl.NumberFormat("en-UG").format(value)} km`;
  const waLink = (message) => `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`;
  const vehicleMessage = (vehicle) => `Hello ${config.businessName}. I am interested in the ${vehicle.make} ${vehicle.model}, listed at ${formatPrice(vehicle)}. Please share more information about its availability and viewing arrangements.`;
  const isAvailable = (vehicle) => vehicle.status === "available";
  const sampleNotice = document.querySelector(".inventory-notice");

  if (vehicles.some(isAvailable)) {
    sampleNotice.textContent = "Vehicle information can change. Contact the team to confirm current availability, specifications and pricing.";
    sampleNotice.classList.add("verified-inventory-notice");
    document.querySelector(".featured-section > .sample-notice").textContent = "Contact the team to confirm current availability, specifications and pricing.";
  }

  function vehicleCard(vehicle) {
    const image = vehicle.images[0];
    const saved = savedIds.includes(vehicle.id);
    const compared = comparedIds.has(vehicle.id);
    return `<article class="vehicle-card">
      <a class="vehicle-photo" href="#vehicle=${encodeURIComponent(vehicle.id)}" aria-label="View ${escapeHtml(vehicle.year)} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)} details">
        <img src="${escapeHtml(image)}" alt="${isAvailable(vehicle) ? "Vehicle photo" : "Example image"} of a ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}" loading="lazy" width="740" height="500">
        <span class="vehicle-status${isAvailable(vehicle) ? " vehicle-status-available" : ""}">${isAvailable(vehicle) ? "Available · confirm with team" : "Example · not for sale"}</span>
      </a>
      <div class="vehicle-quick-actions">${vehicleActionButtons(vehicle)}</div>
      <div class="vehicle-card-content">
        <p class="vehicle-category">${escapeHtml(vehicle.category)} <span>${escapeHtml(String(vehicle.year))}</span></p>
        <h3><a href="#vehicle=${encodeURIComponent(vehicle.id)}">${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</a></h3>
        <p class="vehicle-price">${formatPrice(vehicle)} <span>${isAvailable(vehicle) ? "confirm price" : "example price"}</span></p>
        <div class="vehicle-specs"><span>${formatMileage(vehicle.mileage)}</span><span>${escapeHtml(vehicle.fuel)}</span><span>${escapeHtml(vehicle.transmission)}</span></div>
        <div class="vehicle-card-actions">
          <a class="text-link" href="#vehicle=${encodeURIComponent(vehicle.id)}">View details <span aria-hidden="true">↗</span></a>
          <a class="card-wa" href="${waLink(vehicleMessage(vehicle))}" target="_blank" rel="noopener noreferrer" aria-label="Ask about the ${isAvailable(vehicle) ? "" : "example "}${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)} on WhatsApp">WhatsApp ↗</a>
        </div>
      </div>
    </article>`;
  }

  function vehicleActionButtons(vehicle) {
    const saved = savedIds.includes(vehicle.id);
    const compared = comparedIds.has(vehicle.id);
    return `<button class="quick-action${saved ? " is-active" : ""}" type="button" data-vehicle-action="save" data-vehicle-id="${escapeHtml(vehicle.id)}" aria-pressed="${saved}" aria-label="${saved ? "Remove" : "Save"} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)} ${saved ? "from" : "to"} saved vehicles"><span aria-hidden="true">${saved ? "♥" : "♡"}</span></button>
      <button class="quick-action${compared ? " is-active" : ""}" type="button" data-vehicle-action="compare" data-vehicle-id="${escapeHtml(vehicle.id)}" aria-pressed="${compared}" aria-label="${compared ? "Remove" : "Add"} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)} ${compared ? "from" : "to"} comparison"><span aria-hidden="true">⇄</span></button>`;
  }

  function populateOptions(id, values) {
    const select = document.getElementById(id);
    [...new Set(values)].sort().forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  }

  populateOptions("filter-category", vehicles.map((vehicle) => vehicle.category));
  populateOptions("filter-fuel", vehicles.map((vehicle) => vehicle.fuel));
  populateOptions("filter-transmission", vehicles.map((vehicle) => vehicle.transmission));

  function renderFeatured() {
    featuredGrid.innerHTML = vehicles.filter((vehicle) => vehicle.featured).slice(0, 3).map(vehicleCard).join("");
    observeReveal(featuredGrid, ".vehicle-card");
  }
  renderFeatured();

  populateOptions("finder-category", vehicles.map((vehicle) => vehicle.category));
  populateOptions("finder-fuel", vehicles.map((vehicle) => vehicle.fuel));
  const finderDialog = document.getElementById("finder-dialog");
  document.getElementById("finder-open").addEventListener("click", () => finderDialog.showModal());
  document.getElementById("finder-form").addEventListener("submit", (event) => {
    event.preventDefault();
    document.getElementById("filter-category").value = document.getElementById("finder-category").value;
    document.getElementById("filter-fuel").value = document.getElementById("finder-fuel").value;
    document.getElementById("filter-max-price").value = document.getElementById("finder-budget").value;
    finderDialog.close();
    location.hash = "#vehicles";
    refreshVehicleInteractions();
    document.getElementById("vehicles").scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
    announce("Your matching vehicle examples are ready.");
  });

  function getFilteredVehicles() {
    const query = document.getElementById("filter-search").value.trim().toLowerCase();
    const category = document.getElementById("filter-category").value;
    const fuel = document.getElementById("filter-fuel").value;
    const transmission = document.getElementById("filter-transmission").value;
    const minYear = Number(document.getElementById("filter-min-year").value) || 0;
    const maxPrice = Number(document.getElementById("filter-max-price").value) || Infinity;
    const sort = document.getElementById("sort-vehicles").value;
    const result = vehicles.filter((vehicle) => {
      const searchable = `${vehicle.make} ${vehicle.model}`.toLowerCase();
      return (!query || searchable.includes(query)) &&
        (!category || vehicle.category === category) &&
        (!fuel || vehicle.fuel === fuel) &&
        (!transmission || vehicle.transmission === transmission) &&
        vehicle.year >= minYear && vehicle.price <= maxPrice;
    });
    result.sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "year") return b.year - a.year;
      return new Date(b.dateAdded) - new Date(a.dateAdded);
    });
    return result;
  }

  function renderInventory() {
    const filtered = getFilteredVehicles();
    inventoryGrid.innerHTML = filtered.map(vehicleCard).join("");
    observeReveal(inventoryGrid, ".vehicle-card");
    document.getElementById("result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "example" : "examples"} shown`;
    document.getElementById("empty-state").hidden = filtered.length !== 0;
    inventoryGrid.hidden = filtered.length === 0;
  }

  function renderSavedVehicles() {
    savedIds = savedIds.filter((id) => vehicles.some((vehicle) => vehicle.id === id));
    const savedVehicles = savedIds.map((id) => vehicles.find((vehicle) => vehicle.id === id));
    document.getElementById("saved-count").textContent = String(savedVehicles.length);
    document.getElementById("saved-open").setAttribute("aria-label", `Saved vehicles, ${savedVehicles.length} saved`);
    const list = document.getElementById("saved-list");
    list.innerHTML = savedVehicles.length ? savedVehicles.map((vehicle) => `
      <article class="saved-item">
        <img src="${escapeHtml(vehicle.images[0])}" alt="" loading="lazy" width="160" height="110">
        <div><p class="eyebrow">${escapeHtml(vehicle.category)} · ${escapeHtml(vehicle.year)}</p><h3>${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</h3><p>${formatPrice(vehicle)} <span>example price</span></p><span class="sample-status">Example · not confirmed stock</span></div>
        <div class="saved-item-actions"><a class="text-link" href="#vehicle=${encodeURIComponent(vehicle.id)}">Details ↗</a><button type="button" class="text-button" data-vehicle-action="save" data-vehicle-id="${escapeHtml(vehicle.id)}" aria-label="Remove ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)} from saved vehicles">Remove</button></div>
      </article>`).join("") : `
      <div class="dialog-empty"><span aria-hidden="true">♡</span><h3>Nothing saved yet</h3><p>Tap the heart on a vehicle example to keep it here while you browse.</p><a class="button button-dark" href="#vehicles">Explore vehicles</a></div>`;
  }

  function renderComparison() {
    const selected = [...comparedIds].map((id) => vehicles.find((vehicle) => vehicle.id === id)).filter(Boolean);
    const count = selected.length;
    document.getElementById("header-compare-count").textContent = String(count);
    document.getElementById("compare-open").setAttribute("aria-label", `Compare vehicles, ${count} selected`);
    document.getElementById("compare-tray-count").textContent = `${count} ${count === 1 ? "vehicle" : "vehicles"} selected`;
    document.getElementById("compare-tray").hidden = count === 0;
    document.body.classList.toggle("has-comparison", count > 0);
    document.getElementById("compare-tray-open").disabled = count < 2;
    const content = document.getElementById("comparison-content");
    if (count < 2) {
      content.innerHTML = `<div class="dialog-empty"><span aria-hidden="true">⇄</span><h3>${count ? "Add one more vehicle" : "Choose vehicles to compare"}</h3><p>Select two or three vehicle examples and compare their specifications side by side.</p><button class="button button-dark" type="button" data-dialog-close>Browse vehicle examples</button></div>`;
      return;
    }
    const rows = [
      ["Price", (vehicle) => `${formatPrice(vehicle)} · example`],
      ["Year", (vehicle) => String(vehicle.year)],
      ["Mileage", (vehicle) => formatMileage(vehicle.mileage)],
      ["Category", (vehicle) => vehicle.category],
      ["Fuel", (vehicle) => vehicle.fuel],
      ["Transmission", (vehicle) => vehicle.transmission],
      ["Engine", (vehicle) => vehicle.engine]
    ];
    content.innerHTML = `<div class="comparison-table-wrap"><table class="comparison-table">
      <thead><tr><th scope="col">At a glance</th>${selected.map((vehicle) => `<th scope="col"><img src="${escapeHtml(vehicle.images[0])}" alt="" loading="lazy"><strong>${escapeHtml(vehicle.year)} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</strong><button class="text-button" type="button" data-vehicle-action="compare" data-vehicle-id="${escapeHtml(vehicle.id)}">Remove</button></th>`).join("")}</tr></thead>
      <tbody>${rows.map(([label, value]) => `<tr><th scope="row">${label}</th>${selected.map((vehicle) => `<td>${escapeHtml(value(vehicle))}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
  }

  function refreshVehicleInteractions() {
    renderFeatured();
    renderInventory();
    renderSavedVehicles();
    renderComparison();
    const detailActions = document.querySelector(".detail-utility-actions");
    if (detailActions && activeVehicle) detailActions.innerHTML = vehicleActionButtons(activeVehicle);
  }

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-vehicle-action]");
    if (action) {
      const { vehicleId, vehicleAction } = action.dataset;
      const vehicle = vehicles.find((item) => item.id === vehicleId);
      if (!vehicle) return;
      if (vehicleAction === "save") {
        const wasSaved = savedIds.includes(vehicleId);
        savedIds = wasSaved ? savedIds.filter((id) => id !== vehicleId) : [...savedIds, vehicleId];
        const persisted = persistSavedIds();
        refreshVehicleInteractions();
        announce(wasSaved
          ? `${vehicle.make} ${vehicle.model} removed from saved vehicles.`
          : `Saved ${vehicle.make} ${vehicle.model}.${persisted ? " Available on this device next time." : " Available until this page is closed; browser storage is unavailable."}`);
      }
      if (vehicleAction === "compare") {
        if (comparedIds.has(vehicleId)) {
          comparedIds.delete(vehicleId);
          announce(`${vehicle.make} ${vehicle.model} removed from comparison.`);
        } else if (comparedIds.size >= 3) {
          announce("Compare up to three vehicles at a time. Remove one to add another.");
          return;
        } else {
          comparedIds.add(vehicleId);
          announce(`${vehicle.make} ${vehicle.model} added to comparison.`);
        }
        refreshVehicleInteractions();
      }
      return;
    }
    const closeButton = event.target.closest("[data-dialog-close]");
    if (closeButton) {
      const dialog = closeButton.closest("dialog");
      if (dialog?.open) dialog.close();
      if (closeButton.classList.contains("button")) location.hash = "#vehicles";
      return;
    }
    if (event.target.closest("#saved-open")) {
      renderSavedVehicles();
      document.getElementById("saved-dialog").showModal();
      return;
    }
    if (event.target.closest("#compare-open, #compare-tray-open")) {
      renderComparison();
      document.getElementById("comparison-dialog").showModal();
    }
  });

  document.getElementById("compare-clear").addEventListener("click", () => {
    comparedIds.clear();
    refreshVehicleInteractions();
    announce("Vehicle comparison cleared.");
  });

  function clearFilters() {
    ["filter-search", "filter-category", "filter-fuel", "filter-transmission", "filter-min-year", "filter-max-price"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("sort-vehicles").value = "newest";
    renderInventory();
  }

  ["filter-search", "filter-category", "filter-fuel", "filter-transmission", "filter-min-year", "filter-max-price", "sort-vehicles"].forEach((id) => {
    document.getElementById(id).addEventListener(id === "filter-search" ? "input" : "change", renderInventory);
  });
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  document.getElementById("empty-clear").addEventListener("click", clearFilters);
  document.getElementById("apply-filters").addEventListener("click", () => {
    filterPanel.classList.remove("is-open");
    document.getElementById("filter-open").setAttribute("aria-expanded", "false");
    renderInventory();
  });
  refreshVehicleInteractions();

  document.querySelectorAll("[data-category]").forEach((link) => {
    link.addEventListener("click", () => {
      document.getElementById("filter-category").value = link.dataset.category;
      renderInventory();
    });
  });

  const nav = document.getElementById("primary-nav");
  const menuToggle = document.querySelector(".menu-toggle");
  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.querySelector(".sr-only").textContent = open ? "Close navigation" : "Open navigation";
    nav.classList.toggle("is-open", open);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.querySelector(".sr-only").textContent = "Open navigation";
    }
  });

  document.getElementById("filter-open").addEventListener("click", () => {
    const open = !filterPanel.classList.contains("is-open");
    filterPanel.classList.toggle("is-open", open);
    document.getElementById("filter-open").setAttribute("aria-expanded", String(open));
    if (open) document.getElementById("filter-search").focus();
  });

  const detailContent = document.getElementById("detail-content");

  function renderDetail(vehicle) {
    activeVehicle = vehicle;
    activeImageIndex = 0;
    const sameCategory = vehicles.filter((item) => item.id !== vehicle.id && item.category === vehicle.category);
    const similar = (sameCategory.length ? sameCategory : vehicles.filter((item) => item.id !== vehicle.id)).slice(0, 2);
    const message = vehicleMessage(vehicle);
    detailContent.innerHTML = `
      <div class="detail-heading"><div><p class="eyebrow">${escapeHtml(vehicle.category)} · ${isAvailable(vehicle) ? "Vehicle details" : "Example vehicle"}</p><h1>${escapeHtml(vehicle.year)} ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}</h1><div class="detail-utility-actions">${vehicleActionButtons(vehicle)}</div></div><p class="detail-price">${formatPrice(vehicle)}<span>${isAvailable(vehicle) ? "confirm current price" : "illustrative price only"}</span></p></div>
      <p class="sample-notice detail-notice"><span aria-hidden="true">ⓘ</span> ${isAvailable(vehicle) ? "Contact the team to confirm current availability, specifications and pricing." : "Demonstration vehicle only. This is not confirmed stock and is not available for sale. Contact the team for verified inventory."}</p>
      <div class="detail-layout">
        <div class="gallery">
          <button class="gallery-main" type="button" aria-label="Open full-screen image viewer"><img id="gallery-main-image" src="${escapeHtml(vehicle.images[0])}" alt="Example image ${1} of ${escapeHtml(vehicle.make)} ${escapeHtml(vehicle.model)}" fetchpriority="high"><span class="gallery-expand" aria-hidden="true">⛶ View gallery</span></button>
          <div class="gallery-thumbs" role="group" aria-label="Vehicle photographs">${vehicle.images.map((image, index) => `<button type="button" class="${index === 0 ? "is-active" : ""}" data-gallery-index="${index}" aria-label="Show image ${index + 1}" aria-pressed="${index === 0}"><img src="${escapeHtml(image)}" alt="" loading="lazy"></button>`).join("")}</div>
        </div>
        <aside class="detail-panel"><p class="eyebrow">Vehicle details</p><div class="detail-specs">
          <div><span>Year</span><strong>${escapeHtml(vehicle.year)}</strong></div><div><span>Mileage</span><strong>${formatMileage(vehicle.mileage)}</strong></div>
          <div><span>Fuel type</span><strong>${escapeHtml(vehicle.fuel)}</strong></div><div><span>Transmission</span><strong>${escapeHtml(vehicle.transmission)}</strong></div>
          <div><span>Engine</span><strong>${escapeHtml(vehicle.engine)}</strong></div><div><span>Category</span><strong>${escapeHtml(vehicle.category)}</strong></div>
        </div><p class="sample-status">${isAvailable(vehicle) ? "Availability must be confirmed with the team" : "Demonstration example · not for sale"}</p><h2>Interested in this vehicle?</h2>
          <form id="vehicle-form" class="vehicle-form" data-vehicle-id="${escapeHtml(vehicle.id)}"><label for="vehicle-name">Your name</label><input id="vehicle-name" name="name" autocomplete="name" required><label for="vehicle-phone">Phone number</label><input id="vehicle-phone" name="phone" type="tel" autocomplete="tel" required><label for="vehicle-message">Message</label><textarea id="vehicle-message" name="message" rows="3" required>${escapeHtml(message)}</textarea><button class="button button-dark" type="submit">Continue to WhatsApp <span aria-hidden="true">↗</span></button><p class="form-feedback" id="vehicle-feedback" role="status"></p></form>
          <a class="button button-outline" href="${waLink(message)}" target="_blank" rel="noopener noreferrer">Ask about this example on WhatsApp ↗</a>
          <p class="form-note">${isAvailable(vehicle) ? "Prices and availability can change. Confirm the latest details with the team." : "This is an example listing, not a confirmed offer. Availability must be confirmed directly with the team."}</p>
        </aside>
      </div>
      <div class="detail-description"><p class="eyebrow">${isAvailable(vehicle) ? "Vehicle information" : "About this example"}</p><p>${escapeHtml(vehicle.description)}</p><h2>Specifications</h2><p>Year: ${escapeHtml(vehicle.year)} · Mileage: ${formatMileage(vehicle.mileage)} · Fuel: ${escapeHtml(vehicle.fuel)} · Transmission: ${escapeHtml(vehicle.transmission)} · Engine: ${escapeHtml(vehicle.engine)}</p></div>
      ${similar.length ? `<section class="similar-section"><div class="section-heading"><div><p class="eyebrow">Continue exploring</p><h2>Related examples</h2></div></div><div class="vehicle-grid">${similar.map(vehicleCard).join("")}</div></section>` : ""}
    `;
    document.getElementById("vehicle-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const detailMessage = `${data.get("message")}\n\nName: ${data.get("name")}\nPhone: ${data.get("phone")}\nVehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}\n${vehicleMessage(vehicle)}`;
      openWhatsApp(detailMessage, document.getElementById("vehicle-feedback"));
    });
    const galleryMain = detailContent.querySelector(".gallery-main");
    let touchOrigin = null;
    let skipGalleryClick = false;
    galleryMain.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches[0];
      touchOrigin = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    galleryMain.addEventListener("touchend", (event) => {
      if (!touchOrigin) return;
      const touch = event.changedTouches[0];
      const horizontal = touch.clientX - touchOrigin.x;
      const vertical = touch.clientY - touchOrigin.y;
      touchOrigin = null;
      if (Math.abs(horizontal) < 48 || Math.abs(horizontal) < Math.abs(vertical)) return;
      skipGalleryClick = true;
      setGalleryImage(activeImageIndex + (horizontal < 0 ? 1 : -1));
      window.setTimeout(() => { skipGalleryClick = false; }, 350);
    }, { passive: true });
    galleryMain.addEventListener("click", (event) => {
      if (skipGalleryClick) {
        event.preventDefault();
        return;
      }
      openLightbox();
    });
    detailContent.querySelectorAll("[data-gallery-index]").forEach((button) => button.addEventListener("click", () => setGalleryImage(Number(button.dataset.galleryIndex))));
    observeReveal(detailContent, ".vehicle-card");
    detailPage.hidden = false;
  }

  function setGalleryImage(index) {
    if (!activeVehicle) return;
    activeImageIndex = (index + activeVehicle.images.length) % activeVehicle.images.length;
    const image = document.getElementById("gallery-main-image");
    image.classList.add("is-changing");
    image.src = activeVehicle.images[activeImageIndex];
    image.alt = `Example image ${activeImageIndex + 1} of ${activeVehicle.make} ${activeVehicle.model}`;
    window.requestAnimationFrame(() => image.classList.remove("is-changing"));
    detailContent.querySelectorAll("[data-gallery-index]").forEach((button) => {
      const selected = Number(button.dataset.galleryIndex) === activeImageIndex;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  const lightbox = document.getElementById("lightbox");
  function updateLightbox() {
    document.getElementById("lightbox-image").src = activeVehicle.images[activeImageIndex];
    document.getElementById("lightbox-image").alt = `Example image ${activeImageIndex + 1} of ${activeVehicle.make} ${activeVehicle.model}`;
    document.getElementById("lightbox-count").textContent = `${activeImageIndex + 1} of ${activeVehicle.images.length}`;
  }
  function openLightbox() {
    updateLightbox();
    lightbox.showModal();
  }
  lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
  lightbox.querySelector(".lightbox-prev").addEventListener("click", () => { setGalleryImage(activeImageIndex - 1); updateLightbox(); });
  lightbox.querySelector(".lightbox-next").addEventListener("click", () => { setGalleryImage(activeImageIndex + 1); updateLightbox(); });
  lightbox.addEventListener("click", (event) => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { setGalleryImage(activeImageIndex + 1); updateLightbox(); }
    if (event.key === "ArrowLeft") { setGalleryImage(activeImageIndex - 1); updateLightbox(); }
  });

  function showWhatsAppLinks() {
    document.querySelectorAll('[data-wa="sales"]').forEach((link) => {
      link.href = waLink(`Hello ${config.businessName}. I would like to speak with the Uganda sales team.`);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
    document.querySelectorAll('[data-call="sales"]').forEach((link) => {
      const salesContact = config.contacts.find((contact) => contact.label === "Uganda sales office / manager");
      if (salesContact) link.href = `tel:${salesContact.tel}`;
    });
  }
  showWhatsAppLinks();

  function openWhatsApp(message, feedback) {
    const link = document.createElement("a");
    link.href = waLink(message);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    feedback.textContent = "A WhatsApp message is ready in a new tab. Review and send it there to complete your enquiry. If it did not open, use the WhatsApp contact link.";
  }

  document.getElementById("contact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const message = `Hello ${config.businessName}. I would like to make an enquiry.\n\nName: ${data.get("name")}\nPhone: ${data.get("phone")}\nEmail: ${data.get("email") || "Not provided"}\nEnquiry: ${data.get("category")}\nMessage: ${data.get("message")}`;
    openWhatsApp(message, document.getElementById("contact-feedback"));
  });

  function setRoute() {
    const hash = decodeURIComponent(location.hash.slice(1));
    const detailMatch = hash.match(/^vehicle=(.+)$/);
    const requested = detailMatch ? vehicles.find((vehicle) => vehicle.id === detailMatch[1]) : null;
    const isDetail = Boolean(detailMatch);
    const path = hash.split("?")[0];
    const isHome = path === "" || path === "home" || path === "featured";
    const activePage = isHome ? "home" : path;
    nav.querySelectorAll('a[href^="#"]').forEach((link) => {
      const linkPage = link.getAttribute("href").slice(1);
      if (linkPage === activePage) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    homeView.hidden = isDetail || !isHome;
    inventoryPage.hidden = isDetail || path !== "vehicles";
    aboutPage.hidden = isDetail || path !== "about";
    servicesPage.hidden = isDetail || path !== "services";
    contactPage.hidden = isDetail || path !== "contact";
    detailPage.hidden = !isDetail;
    if (isDetail && requested) {
      renderDetail(requested);
      document.title = `${requested.year} ${requested.make} ${requested.model} | Tiga Investments Car Bond`;
      history.replaceState(null, "", `#vehicle=${encodeURIComponent(requested.id)}`);
      window.scrollTo(0, 0);
    } else if (isDetail) {
      detailContent.innerHTML = '<div class="empty-state"><h1>Vehicle example not found</h1><p>It may have been removed from the demonstration data.</p><a class="button button-dark" href="#vehicles">Browse vehicle information</a></div>';
      document.title = "Vehicle information | Tiga Investments Car Bond";
      window.scrollTo(0, 0);
    } else {
      const titles = { vehicles: "Vehicle information", about: "About us", services: "Services", contact: "Contact" };
      document.title = path && titles[path] ? `${titles[path]} | Tiga Investments Car Bond` : "Tiga Investments Car Bond | Find your next drive";
      if (path === "vehicles") {
        const params = new URLSearchParams(location.hash.split("?")[1] || "");
        if (params.has("category")) document.getElementById("filter-category").value = params.get("category");
        renderInventory();
      }
      if (path) window.scrollTo(0, 0);
      else if (location.hash === "#home") window.scrollTo(0, 0);
    }
  }
  window.addEventListener("hashchange", () => {
    document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
    setRoute();
  });
  setRoute();

  document.getElementById("current-year").textContent = new Date().getFullYear();
  const backToTop = document.getElementById("back-to-top");
  const progressBar = document.getElementById("scroll-progress-bar");
  let scrollFrame = 0;
  const hero = document.querySelector(".hero");
  const heroImage = document.querySelector(".hero-image");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!reduceMotion.matches && canHover.matches) {
    hero.addEventListener("pointermove", (event) => {
      const bounds = hero.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      hero.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
      hero.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
      heroImage.style.setProperty("--hero-x", `${x * -12}px`);
      heroImage.style.setProperty("--hero-y", `${y * -9}px`);
    });
    hero.addEventListener("pointerleave", () => {
      heroImage.style.setProperty("--hero-x", "0px");
      heroImage.style.setProperty("--hero-y", "0px");
    });
  }
  window.addEventListener("pointermove", (event) => {
    if (reduceMotion.matches || !event.target.closest(".vehicle-card")) return;
    const card = event.target.closest(".vehicle-card");
    if (card.matches(":hover")) {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.setProperty("--card-rotate-x", `${y * -1.5}deg`);
      card.style.setProperty("--card-rotate-y", `${x * 1.5}deg`);
    }
  }, { passive: true });
  document.addEventListener("pointerout", (event) => {
    const card = event.target.closest(".vehicle-card");
    if (!card || card.contains(event.relatedTarget)) return;
    card.style.setProperty("--card-rotate-x", "0deg");
    card.style.setProperty("--card-rotate-y", "0deg");
  });
  window.addEventListener("scroll", () => {
    backToTop.classList.toggle("is-visible", window.scrollY > 560);
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${scrollable > 0 ? window.scrollY / scrollable : 0})`;
      if (!reduceMotion.matches && homeView.contains(hero) && !homeView.hidden) {
        heroImage.style.setProperty("--hero-scroll-y", `${Math.min(window.scrollY * 0.08, 34)}px`);
      }
      scrollFrame = 0;
    });
  }, { passive: true });
  backToTop.addEventListener("click", () => window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  }));

  observeReveal(document, ".section-heading, .why-image-wrap, .why-copy, .process-list li, .about-editorial, .service-list article");

  document.querySelectorAll(".interaction-dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.querySelector(".sr-only").textContent = "Open navigation";
    }
  });
}());
