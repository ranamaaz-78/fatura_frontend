import { t } from '../../i18n'
import { DESKTOP_UI } from '../../lib/desktop'

/**
 * One stop of the guided tour of the demo. `target` is a `data-tour="…"` on something on screen: the spotlight goes
 * there. `route` is where the app has to be for that stop (the tour takes it there). With no target, or one that is
 * not on screen (a small window hides the menu, for instance), the card is simply shown in the middle.
 */
export type TourStep = {
  id: string
  route: string | null
  target: string | null
  title: string
  body: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    route: '/app/dashboard',
    target: null,
    title: t('tour.welcomeTitle', 'Welcome to the demo'),
    body: t('tour.welcomeBody', 'This is a practice shop with sample products, clients and invoices. In a few steps you will see the whole system. Use Next, or press Skip to try things yourself.'),
  },
  {
    id: 'dashboard',
    route: '/app/dashboard',
    target: 'page',
    title: t('tour.dashboardTitle', 'Your dashboard'),
    body: t('tour.dashboardBody', 'The month at a glance: what you sold, what is still unpaid, the profit and the products running low. Everything here updates by itself as you work.'),
  },
  {
    id: 'menu',
    route: '/app/dashboard',
    target: 'menu',
    title: t('tour.menuTitle', 'The menu'),
    // The Windows app has a folded bar and keyboard shortcuts; the website has a full menu and neither.
    body: DESKTOP_UI
      ? t('tour.menuBodyDesktop', 'Everything is one click away: move the mouse over the bar to see the names. Ctrl+K opens a quick search to jump anywhere, and F2, F3, F4 and F6 start an invoice, delivery note, quotation or proforma.')
      : t('tour.menuBody', 'Everything is one click away: sales, payments, clients, products, reports and settings.'),
  },
  {
    id: 'new-sale',
    route: '/app/invoices/new',
    target: 'nav:/app/invoices/new',
    title: t('tour.newSaleTitle', 'Make a sale'),
    body: t('tour.newSaleBody', 'New sale is where invoices, delivery notes, quotations and proformas are made, all on one screen. This is the heart of the system.'),
  },
  {
    id: 'scan',
    route: '/app/invoices/new',
    target: 'pos-scan',
    title: t('tour.scanTitle', 'Scan or search a product'),
    body: t('tour.scanBody', 'Scan a barcode, or type a name, and press Enter: the product joins the sale. Then pick the client and press the big button to issue it. Try it now: add a product and issue an invoice.'),
  },
  {
    id: 'invoices',
    route: '/app/invoices',
    target: 'nav:/app/invoices',
    title: t('tour.invoicesTitle', 'Your invoices'),
    body: t('tour.invoicesBody', 'Every invoice you issue is listed here. Open one to print it, save it as a PDF, send it by WhatsApp or record its payment.'),
  },
  {
    id: 'documents',
    route: '/app/quotes',
    target: 'nav:/app/quotes',
    title: t('tour.documentsTitle', 'Quotes, proformas and delivery notes'),
    body: t('tour.documentsBody', 'Each kind of document has its own list and colour. A quotation can become an invoice with one click, and a proforma is paid piece by piece.'),
  },
  {
    id: 'payments',
    route: '/app/payments',
    target: 'nav:/app/payments',
    title: t('tour.paymentsTitle', 'Payments'),
    body: t('tour.paymentsBody', 'Everything that was paid, and what is still owed, in one place, with the way it was paid.'),
  },
  {
    id: 'products',
    route: '/app/products',
    target: 'nav:/app/products',
    title: t('tour.productsTitle', 'Products and barcodes'),
    body: t('tour.productsBody', 'Your catalogue with prices and stock. Add products by hand or from Excel, and print barcode labels for the ones that do not have one.'),
  },
  {
    id: 'clients',
    route: '/app/customers',
    target: 'nav:/app/customers',
    title: t('tour.clientsTitle', 'Clients'),
    body: t('tour.clientsBody', 'Your clients are saved the first time you sell to them, so next time a phone number is enough to find them.'),
  },
  {
    id: 'purchases',
    route: '/app/purchases',
    target: 'nav:/app/purchases',
    title: t('tour.purchasesTitle', 'Purchases'),
    body: t('tour.purchasesBody', 'Record what you buy from your suppliers: which products, how many and at what price. Saving it adds the pieces to your stock by itself.'),
  },
  {
    id: 'reports',
    route: '/app/reports',
    target: 'nav:/app/reports',
    title: t('tour.reportsTitle', 'Reports'),
    body: t('tour.reportsBody', 'Sales, profit, taxes, stock and more, for any period, ready to download as an Excel sheet.'),
  },
  {
    id: 'printables',
    route: '/app/printables',
    target: 'nav:/app/printables',
    title: t('tour.printablesTitle', 'Printables'),
    body: t('tour.printablesBody', 'Choose how your documents look: colour, font, logo and the note at the bottom. Try changing the colour and open an invoice again.'),
  },
  {
    id: 'settings',
    route: '/app/settings?tab=numbering',
    target: 'page',
    title: t('tour.settingsTitle', 'Settings'),
    body: t('tour.settingsBody', 'The IVA rates, and the numbering of your documents: the letters in front of each number and where each month starts.'),
  },
  {
    id: 'done',
    route: '/app/dashboard',
    target: null,
    title: t('tour.doneTitle', 'You are ready'),
    body: t('tour.doneBody', 'That is the whole system. Keep practicing as long as you like: everything you add here is cleared tonight. When you are done, press Exit demo to go back to your own account.'),
  },
]
