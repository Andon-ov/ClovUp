"""
Open Food Facts API client.

Fetches Bulgarian product data from https://bg.openfoodfacts.org
and returns a dict ready to be used with the ClovUp product API.
"""
import json
import logging
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

OFF_API_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
REQUEST_TIMEOUT = 5  # seconds


def fetch_product_data(barcode: str) -> dict | None:
    """
    Fetch product data from Open Food Facts for the given barcode.

    Returns a dict with product fields mapped to ClovUp's Product model,
    or None if the product is not found / request fails.

    Mapping:
        product_name_bg  → name
        code             → barcode
        brands           → description (display only)
        image_url        → image_url (external link, display only)
        quantity         → appended to description
        categories_tags  → category_hint (display only)
    """
    url = OFF_API_URL.format(barcode=barcode.strip())
    req = urllib.request.Request(url, headers={
        "User-Agent": "ClovUp POS - contact@clovup.bg"
    })

    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.URLError as exc:
        logger.warning("OFF request failed for barcode %s: %s", barcode, exc)
        return None
    except Exception as exc:
        logger.warning("OFF unexpected error for barcode %s: %s", barcode, exc)
        return None

    if data.get("status") != 1:
        return None

    product = data.get("product", {})

    # Name — prefer Bulgarian, fallback to generic
    name = (
        product.get("product_name_bg")
        or product.get("product_name")
        or ""
    ).strip()

    if not name:
        return None

    # Build a human-readable description from brand + quantity
    brand = (product.get("brands") or "").strip()
    quantity_str = (product.get("quantity") or "").strip()
    description_parts = [p for p in [brand, quantity_str] if p]
    description = " · ".join(description_parts)

    # Image URL
    image_url = (
        product.get("image_front_url")
        or product.get("image_url")
        or ""
    ).strip()

    # Category hint — take first human-readable tag, strip "en:" prefix
    categories_tags = product.get("categories_tags") or []
    category_hint = ""
    if categories_tags:
        raw = categories_tags[0]
        category_hint = raw.split(":", 1)[-1].replace("-", " ").title()

    return {
        "name": name,
        "barcode": barcode.strip(),
        "description": description,    # brand + quantity — shown in the UI
        "image_url": image_url,        # external link — user can save manually
        "category_hint": category_hint,
        # ClovUp defaults for fields OFF doesn't know
        "vat_group": "Б",              # 20% standard — user must verify
        "unit": "PCS",
        "price": None,                 # must be set by user
    }
