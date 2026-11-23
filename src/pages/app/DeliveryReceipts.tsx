import { DocumentList } from './DocumentList'

/** Delivery receipts (notas de entrega): their own list, apart from the delivery notes. */
function DeliveryReceipts() {
  return <DocumentList type="nota_entrega" />
}

export default DeliveryReceipts
