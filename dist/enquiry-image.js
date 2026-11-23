const enquiryImageDate = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

function wrapEnquiryImageText(context, value, width) {
  const lines = [];
  let line = "";

  for (const word of value.trim().split(/\s+/u)) {
    const next = line ? line + " " + word : word;
    if (context.measureText(next).width <= width) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (context.measureText(word).width <= width) {
      line = word;
      continue;
    }
    line = "";
    for (const character of word) {
      if (line && context.measureText(line + character).width > width) {
        lines.push(line);
        line = "";
      }
      line += character;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function renderEnquiryImage({ rows, notes, date, logo, photo, phone }) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");

  const width = 960;
  const left = 78;
  const right = width - left;
  const detailsTop = 278;
  const valueLeft = 286;
  const photoWidth = 174;
  const photoHeight = 224;
  const detailsRight = photo ? right - photoWidth - 28 : right;
  const lineHeight = 36;
  const valueFont = '26px "Bake Sans", Arial, sans-serif';
  const labelFont = '700 21px "Bake Sans", Arial, sans-serif';
  const serifFont = '"Bake Serif", Georgia, serif';

  context.font = valueFont;
  const layout = rows.map(([label, value]) => ({
    label,
    lines: wrapEnquiryImageText(context, value, detailsRight - valueLeft),
  }));
  const notesLines = notes ? wrapEnquiryImageText(context, notes, right - left - 48) : [];
  const rowsHeight = layout.reduce((height, { lines }) => height + lines.length * lineHeight + 23, 0);
  const detailsBottom = detailsTop + Math.max(rowsHeight, photo ? photoHeight + 40 : 0);
  const notesHeight = notesLines.length ? 74 + notesLines.length * lineHeight : 0;
  const footerTop = detailsBottom + notesHeight + 30;
  canvas.width = width;
  canvas.height = footerTop + 150;

  const ink = "#49263a";
  const rose = "#8f3b59";
  const rule = "#e8c3d1";
  context.textBaseline = "top";
  context.fillStyle = "#f8e0e8";
  context.fillRect(0, 0, width, canvas.height);
  context.beginPath();
  context.roundRect(30, 30, width - 60, canvas.height - 60, 24);
  context.fillStyle = "#fffafb";
  context.fill();
  context.strokeStyle = rule;
  context.lineWidth = 2;
  context.stroke();

  let brandLeft = left;
  if (logo) {
    context.save();
    context.beginPath();
    context.arc(left + 35, 105, 35, 0, Math.PI * 2);
    context.clip();
    context.drawImage(logo, left, 70, 70, 70);
    context.restore();
    brandLeft += 90;
  }
  context.fillStyle = ink;
  context.font = '34px ' + serifFont;
  context.fillText("The CakeFairy", brandLeft, 74);
  context.fillStyle = rose;
  context.font = 'italic 24px ' + serifFont;
  context.fillText("Baked for you", brandLeft, 114);

  context.textAlign = "right";
  context.font = labelFont;
  context.fillText("Draft date", right, 77);
  context.fillStyle = ink;
  context.font = valueFont;
  context.fillText(enquiryImageDate.format(date), right, 108);
  context.textAlign = "left";

  context.fillStyle = rule;
  context.fillRect(left, 166, right - left, 2);
  context.fillStyle = ink;
  context.font = '58px ' + serifFont;
  context.fillText("Enquiry draft", left, 194);

  let y = detailsTop;
  for (const { label, lines } of layout) {
    context.fillStyle = rose;
    context.font = labelFont;
    context.fillText(label, left, y + 4);
    context.fillStyle = ink;
    context.font = valueFont;
    for (const [index, line] of lines.entries()) {
      context.fillText(line, valueLeft, y + index * lineHeight);
    }
    y += lines.length * lineHeight + 23;
    context.fillStyle = rule;
    context.fillRect(left, y - 12, detailsRight - left, 1);
  }

  if (photo) {
    const photoLeft = right - photoWidth;
    context.beginPath();
    context.roundRect(photoLeft, detailsTop, photoWidth, photoHeight, 12);
    context.fillStyle = "#f8e0e8";
    context.fill();
    const scale = Math.min(photoWidth / photo.naturalWidth, photoHeight / photo.naturalHeight);
    const imageWidth = photo.naturalWidth * scale;
    const imageHeight = photo.naturalHeight * scale;
    context.save();
    context.clip();
    context.drawImage(photo, photoLeft + (photoWidth - imageWidth) / 2,
      detailsTop + (photoHeight - imageHeight) / 2, imageWidth, imageHeight);
    context.restore();
    context.fillStyle = rose;
    context.font = '19px "Bake Sans", Arial, sans-serif';
    context.fillText("Reference photo", photoLeft, detailsTop + photoHeight + 12);
  }

  if (notesLines.length) {
    context.beginPath();
    context.roundRect(left, detailsBottom + 6, right - left, notesHeight - 6, 12);
    context.fillStyle = "#f8e0e8";
    context.fill();
    context.fillStyle = rose;
    context.font = labelFont;
    context.fillText("Cake details", left + 24, detailsBottom + 26);
    context.fillStyle = ink;
    context.font = valueFont;
    for (const [index, line] of notesLines.entries()) {
      context.fillText(line, left + 24, detailsBottom + 61 + index * lineHeight);
    }
  }

  context.fillStyle = rule;
  context.fillRect(left, footerTop, right - left, 2);
  context.fillStyle = ink;
  context.font = labelFont;
  context.fillText("Confirm availability and final price with Haifa.", left, footerTop + 24);
  context.fillStyle = rose;
  context.font = '20px "Bake Sans", Arial, sans-serif';
  context.fillText("Somwarpet, Kodagu · " + phone, left, footerTop + 62);
  return canvas;
}

async function downloadEnquiryImage(data) {
  const { logo, photo } = data;
  await Promise.allSettled([
    document.fonts?.load('26px "Bake Sans"'),
    document.fonts?.load('700 21px "Bake Sans"'),
    document.fonts?.load('58px "Bake Serif"'),
    document.fonts?.load('italic 24px "Bake Serif"'),
    logo?.decode?.(),
    photo?.decode?.(),
  ]);
  const canvas = renderEnquiryImage({
    ...data,
    logo: logo?.naturalWidth ? logo : null,
    photo: photo?.naturalWidth ? photo : null,
  });
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    (result) => result ? resolve(result) : reject(new Error("Could not render the draft.")),
    "image/png",
  ));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "the-cakefairy-enquiry-draft.png";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
