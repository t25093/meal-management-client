// תרגום ערכי ה-Enums של השרת לעברית
export const mealTypes = { Dairy: 'חלבית', Meat: 'בשרית', Parve: 'פרווה' };

export const categories = {
  Starter: 'מנה ראשונה',
  Salad: 'סלט',
  Main: 'עיקרית',
  Side: 'תוספת',
  Dessert: 'קינוח',
  Drink: 'שתייה',
  CakeBar: 'בר עוגות',
  Disposables: 'חד פעמי',
};

// בדיוק כמו ה-Enum MeasureUnit בשרת
export const units = {
  Unit: 'יחידות',
  Portion: 'מנות',
  Gram: 'גרם',
  Kilogram: 'ק"ג',
  Milliliter: 'מ"ל',
  Liter: 'ליטר',
  Cup: 'כוסות',
};

// בשרת השדה נקרא KashrutType (ובגרסה מוקדמת KosherType). קוראים את שניהם.
export function dishKashrut(dish) {
  return dish.kashrutType ?? dish.kosherType;
}

// מאכל מתאים לארוחה אם הכשרות שלו זהה לסוג הארוחה, או שהוא פרווה
export function fitsMeal(dish, mealType) {
  const k = dishKashrut(dish);
  return k === mealType || k === 'Parve';
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}
