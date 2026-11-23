const dialog = document.querySelector("#inquiry");
const form = document.querySelector("#inquiry-form");
const { cake, size, pickup, notes } = form.elements;
const sizeField = document.querySelector("#cake-size-field");
const formStatus = document.querySelector("#form-status");
const fallback = document.querySelector("#copy-fallback");
const enquiryPrice = document.querySelector("#enquiry-price");
const enquiryDesign = document.querySelector("#enquiry-design");
const whatsapp = document.querySelector("#whatsapp-link").href;
const search = document.querySelector("#cake-search");
const cakeSort = document.querySelector("#cake-sort");
const results = document.querySelector("#menu-count");
const priceTable = document.querySelector(".price-table");
const menu = [...document.querySelectorAll("[data-cake-row]")].map((row, index) => {
  const button = row.querySelector("[data-cake]");
  const name = button.textContent.trim();
  const prices = [...row.querySelectorAll("[data-price]")].map((price) => ({
    size: price.dataset.price,
    amount: price.textContent.trim(),
  }));
  const option = new Option(name, String(index));
  cake.add(option);
  button.setAttribute("aria-label", "Enquire about " + name);
  button.addEventListener("click", () => openEnquiry(button, option.value));
  return { row, name, prices };
});

let lastTrigger;

function filterMenu() {
  const query = search.value.trim().toLowerCase();
  for (const item of menu) {
    item.row.hidden = !item.name.toLowerCase().includes(query);
  }
  const matches = menu.filter(({ row }) => !row.hidden).length;
  priceTable.hidden = matches === 0;
  results.textContent = matches ? (matches + (matches === 1 ? " cake" : " cakes")) : "No cakes match your search.";
}

const cakeNameOrder = new Intl.Collator("en-IN", { sensitivity: "base", numeric: true });

function compareCakeNames(first, second) {
  return cakeNameOrder.compare(first.name, second.name);
}

function priceForSize(item, size) {
  const price = item.prices.find((entry) => entry.size === size);
  return price ? Number(price.amount.replace(/[₹,\s]/g, "")) : null;
}

function sortMenu() {
  const [field, direction] = cakeSort.value.split(":");
  const sign = direction === "desc" ? -1 : 1;
  const ordered = menu.slice();

  if (field === "name") {
    ordered.sort((first, second) => sign * compareCakeNames(first, second));
  } else if (field) {
    ordered.sort((first, second) => {
      const firstPrice = priceForSize(first, field);
      const secondPrice = priceForSize(second, field);
      if (firstPrice === null) return secondPrice === null ? compareCakeNames(first, second) : 1;
      if (secondPrice === null) return -1;
      return sign * (firstPrice - secondPrice) || compareCakeNames(first, second);
    });
  }

  priceTable.tBodies[0].append(...ordered.map(({ row }) => row));
}

function selectedCake() {
  return cake.value === "" ? undefined : menu[Number(cake.value)];
}

function updateSizeChoices() {
  const sizedPrices = selectedCake()?.prices.filter((price) => price.size) ?? [];
  size.replaceChildren(new Option("Choose a size", ""), ...sizedPrices.map((price) => new Option(price.size, price.size)));
  sizeField.hidden = !sizedPrices.length;
  size.disabled = !sizedPrices.length;
}

function menuPriceText(item) {
  const sizePrice = item.prices.find((price) => price.size && price.size === size.value);
  if (sizePrice) return "Menu price: " + sizePrice.amount + " (" + sizePrice.size + ")";
  if (item.prices.length === 1) return "Menu price: " + item.prices[0].amount + " (ask for size)";
  return "Menu prices: " + item.prices.map((price) => price.size + " " + price.amount).join(" / ");
}

function updateForm() {
  const item = selectedCake();
  enquiryPrice.hidden = !item;
  enquiryPrice.textContent = item ? menuPriceText(item) : "";
  formStatus.textContent = "";
  fallback.hidden = true;
}

function openEnquiry(trigger, choice = cake.value) {
  lastTrigger = trigger;
  const design = trigger.dataset.galleryDesign;
  enquiryDesign.hidden = !design;
  const flavour = trigger.dataset.galleryFlavour;
  enquiryDesign.textContent = design ? "Gallery design: " + design : "";
  if (flavour) enquiryDesign.textContent += " · Pictured flavour: " + flavour;
  if (design) choice = "";
  if (choice !== cake.value) {
    cake.value = choice;
    updateSizeChoices();
  }
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
  pickup.min = localToday.toISOString().slice(0, 10);
  updateForm();
  dialog.showModal();
}

search.addEventListener("input", filterMenu);
cakeSort.addEventListener("change", sortMenu);
filterMenu();
document.querySelector("#menu-tools").hidden = false;
document.querySelectorAll("[data-order]").forEach((button) => {
  button.addEventListener("click", () => openEnquiry(button));
});
dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => lastTrigger?.focus());
form.addEventListener("input", (event) => {
  if (event.target === cake) updateSizeChoices();
  updateForm();
});

function openWhatsAppDraft(message) {
  const url = new URL(whatsapp);
  url.searchParams.set("text", message);
  window.location.assign(url.href);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const action = event.submitter?.value ?? "whatsapp";
  const item = selectedCake();
  const details = notes.value.trim();
  const lines = ["Hi The CakeFairy! I’d like to enquire about a cake."];
  const photo = enquiryDesign.hidden ? null : lastTrigger.closest(".gallery-cake")?.querySelector("img");
  if (!enquiryDesign.hidden) {
    lines.push(enquiryDesign.textContent);
    if (photo) lines.push("Photo: " + photo.src);
  }
  if (item) {
    lines.push("Cake: " + item.name, enquiryPrice.textContent);
  }
  if (pickup.value) lines.push("Preferred pickup date: " + pickup.value);
  if (details) lines.push("Cake details: " + details);
  const draft = lines.join("\n");

  if (action === "whatsapp") {
    openWhatsAppDraft(draft);
    return;
  }

  if (action === "download") {
    const rows = [];
    const { galleryDesign, galleryFlavour } = lastTrigger?.dataset ?? {};
    if (galleryDesign) rows.push(["Design", galleryDesign]);
    if (galleryFlavour) rows.push(["Pictured flavour", galleryFlavour]);
    if (!galleryDesign && !item) rows.push(["Cake", "Custom cake enquiry"]);
    if (item) {
      rows.push(["Cake or flavour", item.name]);
      if (size.value) rows.push(["Size", size.value]);
      const pricing = enquiryPrice.textContent.replace(/^Menu prices?: /, "");
      rows.push(["Menu pricing", size.value ? pricing.replace(" (" + size.value + ")", "") : pricing]);
    }
    if (pickup.value) {
      rows.push(["Preferred pickup", enquiryImageDate.format(new Date(pickup.value + "T00:00:00Z"))]);
    }

    event.submitter.disabled = true;
    formStatus.textContent = "Preparing your draft image…";
    try {
      await downloadEnquiryImage({
        rows,
        notes: details,
        date: new Date(),
        photo,
        logo: document.querySelector(".site-header .brand-logo"),
        phone: document.querySelector(".contact-number").textContent.trim(),
      });
      formStatus.textContent = "Your draft image is ready to share.";
    } catch {
      formStatus.textContent = "Couldn’t create the draft image. Please try again.";
    } finally {
      event.submitter.disabled = false;
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(draft);
    formStatus.textContent = "Enquiry copied. You can paste it into a message to the baker.";
  } catch {
    fallback.value = draft;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    formStatus.textContent = "Select and copy the draft below.";
  }
});

const valuesWindow = document.querySelector("#values-window");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function syncStripMotion() {
  const sliding = !reducedMotion.matches;
  valuesWindow.toggleAttribute("data-sliding", sliding);
  valuesWindow.setAttribute("role", sliding ? "button" : "region");
  valuesWindow.setAttribute("aria-label", sliding ? "Pause sliding bakery highlights" : "Bakery highlights");
  if (sliding) {
    valuesWindow.tabIndex = 0;
    valuesWindow.setAttribute("aria-describedby", "values-phrases");
    valuesWindow.setAttribute("aria-pressed", "false");
    valuesWindow.title = "Click or press Space to pause or resume.";
  } else {
    for (const attribute of ["tabindex", "aria-describedby", "aria-pressed", "title"]) {
      valuesWindow.removeAttribute(attribute);
    }
  }
}

function toggleStripMotion() {
  if (reducedMotion.matches) return;
  const isPaused = valuesWindow.getAttribute("aria-pressed") === "true";
  valuesWindow.setAttribute("aria-pressed", String(!isPaused));
}

valuesWindow.addEventListener("click", toggleStripMotion);
valuesWindow.addEventListener("keydown", (event) => {
  if (reducedMotion.matches || (event.key !== " " && event.key !== "Enter")) return;
  event.preventDefault();
  if (!event.repeat) toggleStripMotion();
});
reducedMotion.addEventListener("change", syncStripMotion);
syncStripMotion();

const reviewForm = document.querySelector("#review-form");
const reviewName = reviewForm.elements.displayName;
const reviewText = reviewForm.elements.review;
const reviewSubmit = document.querySelector("#review-submit");
const reviewCompose = document.querySelector("#review-compose");
const reviewSignIn = document.querySelector("#review-sign-in");
const reviewStatus = document.querySelector("#review-status");
const reviewSummary = document.querySelector("#review-summary");
const reviewList = document.querySelector("#review-list");
const reviewMore = document.querySelector("#review-more");
const reviewTemplate = document.querySelector("#review-template");
const reviewDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });
let reviewPage = 0;
let clerkPublishableKey;
let reviewClerk;
let clerkLoading;

function loadClerkScript(src, attributes = {}) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error("Couldn’t load sign-in."));
    }, { once: true });
    document.head.append(script);
  });
}

function loadReviewClerk() {
  if (clerkLoading) return clerkLoading;

  clerkLoading = (async () => {
    const hostname = atob(clerkPublishableKey.split("_")[2]).replace(/\$$/, "");
    if (!/^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/i.test(hostname)) throw new Error("Invalid Clerk host.");
    const cdn = "https://" + hostname + "/npm/@clerk/";
    if (!window.__internal_ClerkUICtor) await loadClerkScript(cdn + "ui@1/dist/ui.browser.js");
    if (!window.Clerk) {
      await loadClerkScript(cdn + "clerk-js@6/dist/clerk.browser.js", {
        "data-clerk-publishable-key": clerkPublishableKey,
      });
    }
    await window.Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
    reviewClerk = window.Clerk;

    let currentSessionId = reviewClerk.session?.id;
    reviewClerk.addListener(({ session }) => {
      if (session?.id === currentSessionId) return;
      currentSessionId = session?.id;
      reviewForm.reset();
      setReviewFormOpen(false);
      loadReviews(1);
    }, { skipInitialEmit: true });
    if (currentSessionId) await loadReviews(1);
    return reviewClerk;
  })().catch(error => {
    clerkLoading = undefined;
    throw error;
  });
  return clerkLoading;
}

function setReviewFormOpen(open) {
  reviewForm.hidden = !open;
  reviewCompose.setAttribute("aria-expanded", String(open));
}

async function requestReviews(path, options) {
  const headers = new Headers(options?.headers);
  const token = await reviewClerk?.session?.getToken();
  if (token) headers.set("Authorization", "Bearer " + token);
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Reviews are temporarily unavailable.");
  return data;
}

function addReviewCard(review) {
  const card = reviewTemplate.content.cloneNode(true);
  card.querySelector("[data-review-name]").textContent = review.displayName;
  const date = new Date(review.updatedAt);
  const dateElement = card.querySelector("[data-review-date]");
  dateElement.dateTime = date.toISOString();
  dateElement.textContent = reviewDate.format(date);
  const rating = card.querySelector("[data-review-rating]");
  rating.setAttribute("aria-label", review.rating + " out of 5 stars");
  rating.textContent = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
  card.querySelector("[data-review-text]").textContent = review.review;
  reviewList.append(card);
}

async function loadReviews(page) {
  reviewMore.disabled = true;
  try {
    const data = await requestReviews("/api/reviews?page=" + page);
    const countLabel = data.count === 1 ? "1 review" : data.count + " reviews";
    reviewSummary.textContent = data.count ? data.average.toFixed(1) + " out of 5 · " + countLabel : "No reviews yet.";
    if (page === 1) {
      reviewList.replaceChildren();
      clerkPublishableKey = data.clerkPublishableKey;
      reviewCompose.hidden = !data.canReview;
      reviewSignIn.hidden = data.canReview || !clerkPublishableKey;
      reviewCompose.textContent = data.ownReview ? "Edit your review" : "Write a review";
      reviewSubmit.textContent = data.ownReview ? "Save changes" : "Post review";
      if (data.ownReview) {
        reviewName.value = data.ownReview.displayName;
        reviewForm.elements.rating.value = String(data.ownReview.rating);
        reviewText.value = data.ownReview.review;
      }
    }
    data.reviews.forEach(addReviewCard);
    reviewMore.hidden = !data.hasMore;
    reviewPage = page;
  } catch {
    if (page === 1) {
      reviewSummary.textContent = "Reviews are temporarily unavailable.";
      reviewCompose.hidden = true;
      reviewSignIn.hidden = true;
      setReviewFormOpen(false);
    }
    else reviewStatus.textContent = "Couldn’t load more reviews. Please try again.";
  } finally {
    reviewMore.disabled = false;
  }
}

reviewSignIn.addEventListener("click", async () => {
  reviewSignIn.disabled = true;
  reviewStatus.textContent = "";
  try {
    const clerk = await loadReviewClerk();
    if (!clerk.session) {
      clerk.openSignIn({
        fallbackRedirectUrl: "/#reviews",
        signUpFallbackRedirectUrl: "/#reviews",
      });
    }
  } catch {
    reviewStatus.textContent = "Couldn’t open sign-in. Please try again.";
  } finally {
    reviewSignIn.disabled = false;
  }
});

reviewCompose.addEventListener("click", () => {
  setReviewFormOpen(reviewForm.hidden);
  if (!reviewForm.hidden) reviewName.focus();
});
reviewMore.addEventListener("click", () => {
  reviewStatus.textContent = "";
  loadReviews(reviewPage + 1);
});
reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  reviewStatus.textContent = "";
  reviewSubmit.disabled = true;
  try {
    await requestReviews("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: reviewName.value.trim(),
        rating: Number(reviewForm.elements.rating.value),
        review: reviewText.value.trim(),
      }),
    });
    setReviewFormOpen(false);
    reviewStatus.textContent = "Your review was published.";
    await loadReviews(1);
    reviewCompose.focus();
  } catch (error) {
    reviewStatus.textContent = error.message;
  } finally {
    reviewSubmit.disabled = false;
  }
});

loadReviews(1).then(() => {
  if (clerkPublishableKey) loadReviewClerk().catch(() => {});
});
