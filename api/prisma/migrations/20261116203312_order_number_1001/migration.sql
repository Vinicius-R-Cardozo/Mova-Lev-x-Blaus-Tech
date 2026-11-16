-- Números de pedido começam em #1001 (só reinicia se ainda não houver pedidos).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders) THEN
    PERFORM setval(pg_get_serial_sequence('orders', 'number'), 1000, true);
  END IF;
END $$;
