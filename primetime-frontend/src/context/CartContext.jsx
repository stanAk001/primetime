import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

/**
 * The table's running order.
 *
 * Deliberately in memory only — a tab belongs to one sitting, and reviving
 * last week's cart when someone rescans the code at table 9 would be worse
 * than starting empty. Prices here are for display; the server re-reads every
 * price from the menu when the order is placed.
 */
export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);

  const add = useCallback((item, quantity = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.id === item.id);
      if (found) {
        return prev.map((l) =>
          l.id === item.id
            ? { ...l, quantity: Math.min(l.quantity + quantity, 99) }
            : l
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          serving: item.serving,
          quantity: Math.min(quantity, 99),
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((id, quantity) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) =>
            l.id === id ? { ...l, quantity: Math.min(quantity, 99) } : l
          )
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    const total = lines.reduce((n, l) => n + l.price * l.quantity, 0);
    return {
      lines,
      count,
      total,
      add,
      setQuantity,
      clear,
      quantityOf: (id) => lines.find((l) => l.id === id)?.quantity ?? 0,
    };
  }, [lines, add, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Returns null outside a provider, so the menu can render read-only on the
// marketing page without an ordering surface attached.
export const useCart = () => useContext(CartContext);
