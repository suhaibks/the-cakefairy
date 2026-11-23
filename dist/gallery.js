for (const card of document.querySelectorAll(".gallery-cake")) {
  const enquiry = card.querySelector(".gallery-enquiry");
  const photo = card.querySelector(".gallery-photo");
  const link = new URL(enquiry.href);
  link.searchParams.set("text", link.searchParams.get("text") + "\nPhoto: " + photo.href);
  enquiry.href = link.href;
}
