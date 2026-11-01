import { MasterLcdItem, DiscountRule } from './types';

/**
 * Checks if a Master LCD item matches the criteria of a discount rule
 */
export function matchesDiscountRule(item: MasterLcdItem, rule: DiscountRule): boolean {
  if (!rule.isActive) return false;

  // 1. Check Brand LCD (VIVAN vs XPAS)
  if (rule.targetBrandLcd && rule.targetBrandLcd !== 'ALL') {
    const itemBrand = String(item.brand_ || item.brand_lcd || '').trim().toUpperCase();
    if (rule.targetBrandLcd.toUpperCase() === 'VIVAN' && !itemBrand.includes('VIVAN')) {
      return false;
    }
    if (rule.targetBrandLcd.toUpperCase() === 'XPAS' && (!itemBrand.includes('XPAS') && !itemBrand.includes('X-PAS') && itemBrand !== 'XP')) {
      return false;
    }
  }

  // 2. Check Brand HP (IPHONE, SAMSUNG, REALME, etc.)
  if (rule.targetBrandHp && rule.targetBrandHp !== 'ALL') {
    const itemHp = String(item.brand_hp || '').trim().toUpperCase();
    if (itemHp !== rule.targetBrandHp.trim().toUpperCase()) {
      return false;
    }
  }

  // 3. Check Status LCD (upgrade vs nonupgrade must be exact match to avoid 'upgrade' matching 'nonupgrade')
  if (rule.targetStatusLcd && rule.targetStatusLcd !== 'ALL') {
    const itemStatus = String(item.status_lcd || '').trim().toLowerCase();
    const targetStatus = rule.targetStatusLcd.trim().toLowerCase();
    if (itemStatus !== targetStatus) {
      return false;
    }
  }

  // 4. Check OLED / Soft OLED (exact match to avoid 'oled' matching 'soft oled')
  if (rule.targetOled && rule.targetOled !== 'ALL') {
    const itemOled = String(item.oled_soft_oled || '').trim().toLowerCase();
    const targetOled = rule.targetOled.trim().toLowerCase();
    if (itemOled !== targetOled) {
      return false;
    }
  }

  return true;
}

/**
 * Applies active discount rules to a single item and returns the updated item
 */
export function calculateItemDiscount(item: MasterLcdItem, rules: DiscountRule[]): MasterLcdItem {
  // Always preserve original base prices
  const origPcs = item.original_harga_pcs !== undefined ? item.original_harga_pcs : (item.harga_pcs || 0);
  const origBox = item.original_harga_box !== undefined ? item.original_harga_box : (item.harga_box || 0);

  const activeRules = rules.filter(r => r.isActive && r.discountValue > 0);
  if (activeRules.length === 0) {
    return {
      ...item,
      harga_pcs: origPcs,
      harga_box: origBox,
      original_harga_pcs: origPcs,
      original_harga_box: origBox,
      applied_discount_text: undefined,
      discount_amount_pcs: 0
    };
  }

  // Find all matching rules
  const matchingRules = activeRules.filter(rule => matchesDiscountRule(item, rule));

  if (matchingRules.length === 0) {
    return {
      ...item,
      harga_pcs: origPcs,
      harga_box: origBox,
      original_harga_pcs: origPcs,
      original_harga_box: origBox,
      applied_discount_text: undefined,
      discount_amount_pcs: 0
    };
  }

  // Deduplicate rules with identical targeting scope so alternate tiers do not compound unintentionally
  const appliedScopes = new Set<string>();
  const effectiveRules: DiscountRule[] = [];
  for (const rule of matchingRules) {
    const scopeKey = `${rule.targetBrandLcd}_${rule.targetBrandHp}_${rule.targetStatusLcd}_${rule.targetOled}`;
    if (!appliedScopes.has(scopeKey)) {
      appliedScopes.add(scopeKey);
      effectiveRules.push(rule);
    }
  }

  // Apply matching rules
  let currentPcs = origPcs;
  let currentBox = origBox;
  const discountTexts: string[] = [];

  for (const rule of effectiveRules) {
    if (rule.discountType === 'percentage') {
      const discountPercent = Math.min(100, Math.max(0, rule.discountValue));
      currentPcs = Math.round(currentPcs * (1 - discountPercent / 100));
      if (item.packing && item.packing > 0) {
        currentBox = currentPcs * item.packing;
      } else {
        currentBox = Math.round(currentBox * (1 - discountPercent / 100));
      }
      discountTexts.push(`${discountPercent}%`);
    } else if (rule.discountType === 'nominal_pcs') {
      const discountNominal = Math.max(0, rule.discountValue);
      currentPcs = Math.max(0, currentPcs - discountNominal);
      if (item.packing && item.packing > 0) {
        currentBox = currentPcs * item.packing;
      } else {
        currentBox = Math.max(0, currentBox - discountNominal);
      }
      discountTexts.push(`-Rp ${discountNominal.toLocaleString()}`);
    } else if (rule.discountType === 'nominal_box') {
      const discountNominal = Math.max(0, rule.discountValue);
      currentBox = Math.max(0, currentBox - discountNominal);
      if (item.packing && item.packing > 0) {
        currentPcs = Math.round(currentBox / item.packing);
      } else {
        currentPcs = currentBox;
      }
      discountTexts.push(`-Rp ${discountNominal.toLocaleString()}/box`);
    }
  }

  const discountAmount = Math.max(0, origPcs - currentPcs);

  return {
    ...item,
    harga_pcs: currentPcs,
    harga_box: currentBox,
    original_harga_pcs: origPcs,
    original_harga_box: origBox,
    applied_discount_text: discountTexts.join(', '),
    discount_amount_pcs: discountAmount
  };
}

/**
 * Applies discount rules to an array of items
 */
export function applyDiscountsToItems(items: MasterLcdItem[], rules: DiscountRule[]): MasterLcdItem[] {
  return items.map(item => calculateItemDiscount(item, rules));
}
