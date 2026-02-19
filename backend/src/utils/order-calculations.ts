/**
 * Утилиты для расчетов заказов
 */

export interface OrderItem {
  meters: number
  pricePerMeter: number
  metersPerRoll?: number
}

/**
 * Рассчитать количество рулонов для тканей
 * BR-ITEM-001: rolls = Math.ceil(meters / rollLength)
 */
export function calculateRolls(meters: number, metersPerRoll: number = 100): number {
  if (meters <= 0) {
    throw new Error('Meters must be positive');
  }
  if (metersPerRoll <= 0) {
    throw new Error('MetersPerRoll must be positive');
  }
  
  return Math.ceil(meters / metersPerRoll);
}

/**
 * Рассчитать общую стоимость заказа
 */
export function calculateOrderTotal(items: OrderItem[]): number {
  if (!items || items.length === 0) {
    return 0;
  }

  return items.reduce((total, item) => {
    if (item.meters <= 0 || item.pricePerMeter <= 0) {
      throw new Error('Invalid item: meters and pricePerMeter must be positive');
    }
    return total + (item.meters * item.pricePerMeter);
  }, 0);
}

/**
 * Валидация минимальной нарезки
 */
export function validateMinimumCut(meters: number, minimumCut: number): boolean {
  return meters >= minimumCut;
}