import { describe, it, expect } from 'vitest'
import { 
  calculateRolls, 
  calculateOrderTotal, 
  validateMinimumCut,
  type OrderItem 
} from '../src/utils/order-calculations'

describe('Order Calculations', () => {
  describe('calculateRolls', () => {
    it('should calculate rolls correctly for exact division', () => {
      expect(calculateRolls(100, 100)).toBe(1)
      expect(calculateRolls(200, 100)).toBe(2)
      expect(calculateRolls(300, 100)).toBe(3)
    })

    it('should round up for partial rolls', () => {
      expect(calculateRolls(101, 100)).toBe(2)
      expect(calculateRolls(150, 100)).toBe(2) 
      expect(calculateRolls(299, 100)).toBe(3)
    })

    it('should handle different roll lengths', () => {
      expect(calculateRolls(50, 50)).toBe(1)
      expect(calculateRolls(75, 50)).toBe(2)
      expect(calculateRolls(25, 50)).toBe(1)
    })

    it('should throw error for invalid inputs', () => {
      expect(() => calculateRolls(0, 100)).toThrow('Meters must be positive')
      expect(() => calculateRolls(-5, 100)).toThrow('Meters must be positive')
      expect(() => calculateRolls(100, 0)).toThrow('MetersPerRoll must be positive')
      expect(() => calculateRolls(100, -10)).toThrow('MetersPerRoll must be positive')
    })
  })

  describe('calculateOrderTotal', () => {
    it('should return 0 for empty order', () => {
      expect(calculateOrderTotal([])).toBe(0)
    })

    it('should calculate total for single item', () => {
      const items: OrderItem[] = [
        { meters: 5, pricePerMeter: 100 }
      ]
      expect(calculateOrderTotal(items)).toBe(500)
    })

    it('should calculate total for multiple items', () => {
      const items: OrderItem[] = [
        { meters: 5, pricePerMeter: 100 },
        { meters: 3, pricePerMeter: 150 },
        { meters: 2, pricePerMeter: 200 }
      ]
      // 5*100 + 3*150 + 2*200 = 500 + 450 + 400 = 1350
      expect(calculateOrderTotal(items)).toBe(1350)
    })

    it('should handle decimal values', () => {
      const items: OrderItem[] = [
        { meters: 2.5, pricePerMeter: 100.50 }
      ]
      expect(calculateOrderTotal(items)).toBe(251.25)
    })

    it('should throw error for invalid items', () => {
      const invalidItems: OrderItem[] = [
        { meters: 0, pricePerMeter: 100 }
      ]
      expect(() => calculateOrderTotal(invalidItems)).toThrow('Invalid item')
      
      const negativePrice: OrderItem[] = [
        { meters: 5, pricePerMeter: -100 }
      ]
      expect(() => calculateOrderTotal(negativePrice)).toThrow('Invalid item')
    })
  })

  describe('validateMinimumCut', () => {
    it('should return true when meters meets minimum', () => {
      expect(validateMinimumCut(5, 3)).toBe(true)
      expect(validateMinimumCut(10, 10)).toBe(true)
      expect(validateMinimumCut(15, 5)).toBe(true)
    })

    it('should return false when meters below minimum', () => {
      expect(validateMinimumCut(2, 3)).toBe(false)
      expect(validateMinimumCut(5, 10)).toBe(false)
      expect(validateMinimumCut(0, 1)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(validateMinimumCut(3, 3)).toBe(true) // exactly equal
      expect(validateMinimumCut(2.99, 3)).toBe(false) // just under
      expect(validateMinimumCut(3.01, 3)).toBe(true) // just over
    })
  })
})