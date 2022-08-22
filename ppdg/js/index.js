const FOOTER_MARKETPLACE_URL = "./resources/footer-marketplace.txt";
const FOOTER_FACEBOOK_URL = "./resources/footer-facebook.txt";

const marketplaceButton = document.getElementById("marketplace");
const facebookButton = document.getElementById("facebook");

async function readFile(url) {
  return fetch(url)
    .then((response) => response.text())
    .then((text) => text);
}

async function generateMarketplaceDescription() {
  const productName = document.getElementById("product-name").value;
  const shortDescription = document.getElementById("description").value;
  const specification = document.getElementById("specification").value;
  const footer = await readFile(FOOTER_MARKETPLACE_URL);

  const result = `${productName}
  
${shortDescription}

${specification}

${footer}`;

  navigator.clipboard.writeText(result.trim());

  setCopiedVisual(marketplaceButton);
}

async function generateFacebookDescription() {
  const productName = document.getElementById("product-name").value;
  const shortDescription = document.getElementById("description").value;
  const footer = await readFile(FOOTER_FACEBOOK_URL);

  const result = `${productName}
  
${shortDescription}

${footer}`;

  navigator.clipboard.writeText(result.trim());

  setCopiedVisual(facebookButton);
}

function setCopiedVisual(btn) {
  const defaultButtonText = btn.textContent;

  setTimeout(() => {
    btn.textContent = defaultButtonText;
    btn.disabled = false;
  }, 1000);

  btn.textContent = "Copied!";
  btn.disabled = true;
}
