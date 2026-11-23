import InvoiceNew from './InvoiceNew'

/**
 * A new delivery receipt: the counter's design and lines, on its own page. The kind is fixed, there is no client box
 * and no payment; issuing it takes the goods out of stock.
 */
function DeliveryReceiptNew() {
  return <InvoiceNew fixedType="nota_entrega" />
}

export default DeliveryReceiptNew
