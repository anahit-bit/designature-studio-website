/**
 * Sandbox CancelPayment milestone + diagnostic helper (one-off, dev/sandbox only).
 *
 *   npx tsx scripts/sandbox-cancel-test.ts [orderIdBase]
 *
 * Runs 5 cycles of InitPayment → immediate CancelPayment via DIRECT REST (no UI,
 * no gateway redirect), then — if a cancel fails — probes GetPaymentDetails to
 * reveal what state a freshly-initiated payment is actually in. This answers
 * whether CancelPayment can void a never-completed payment, or whether it needs
 * an authorized/deposited amount first.
 *
 * orderIdBase (optional arg) lets you avoid reusing OrderIDs across runs; default
 * 4423510. Must stay within the sandbox range 4423001..4424000.
 *
 * NOTE: the project's env lives at E:/Secrets/Website/.env (NOT a local .env), so
 * we load it with the same fallback server.ts uses instead of `dotenv/config`.
 */
import dotenv from 'dotenv'
import { existsSync } from 'fs'

const FALLBACK_ENV_PATH = 'E:/Secrets/Website/.env'
dotenv.config({
  path: existsSync('.env') ? '.env' : existsSync(FALLBACK_ENV_PATH) ? FALLBACK_ENV_PATH : undefined,
})

const {
  AMERIA_VPOS_BASE_URL,
  AMERIA_CLIENT_ID,
  AMERIA_CLIENT_USR,
  AMERIA_CLIENT_PASS,
} = process.env

const ORDER_ID_BASE = Number(process.argv[2]) || 4423510

async function postJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${AMERIA_VPOS_BASE_URL}api/VPOS/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let parsed: any = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    /* leave parsed null; raw text logged */
  }
  return { status: res.status, parsed, text }
}

async function initAndCancel(testIndex: number) {
  const orderId = ORDER_ID_BASE + testIndex
  console.log(`\n--- Test ${testIndex + 1}: OrderID ${orderId} ---`)

  const init = await postJson('InitPayment', {
    ClientID: AMERIA_CLIENT_ID,
    Username: AMERIA_CLIENT_USR,
    Password: AMERIA_CLIENT_PASS,
    Amount: 10,
    OrderID: orderId,
    Currency: '051',
    Description: 'Sandbox cancel test',
    BackURL: 'http://localhost:3000/api/payments/ameria/callback',
  })
  console.log('  InitPayment:', init.status, init.parsed ?? init.text)

  const paymentId = init.parsed?.PaymentID
  if (init.parsed?.ResponseCode !== 1 || !paymentId) {
    console.error('  ✗ Init failed, skipping cancel')
    return
  }

  const cancel = await postJson('CancelPayment', {
    PaymentID: paymentId,
    Username: AMERIA_CLIENT_USR,
    Password: AMERIA_CLIENT_PASS,
  })
  console.log('  CancelPayment:', cancel.status, cancel.parsed ?? cancel.text)

  if (cancel.parsed?.ResponseCode === '00') {
    console.log('  ✓ Cancelled successfully')
    return
  }

  console.log(`  ✗ Cancel not accepted (status ${cancel.status}) — probing payment state…`)
  const details = await postJson('GetPaymentDetails', {
    PaymentID: paymentId,
    Username: AMERIA_CLIENT_USR,
    Password: AMERIA_CLIENT_PASS,
  })
  const d = details.parsed ?? {}
  console.log('  GetPaymentDetails:', details.status, {
    ResponseCode: d.ResponseCode,
    PaymentState: d.PaymentState,
    OrderStatus: d.OrderStatus,
    Amount: d.Amount,
    DepositedAmount: d.DepositedAmount,
    ResponseMessage: d.ResponseMessage,
  })
}

/**
 * Decisive test: cancel an ALREADY-COMPLETED payment by its PaymentID (grab it
 * from /admin/orders after paying via /consultation with the test card). If this
 * returns ResponseCode "00", CancelPayment is for deposited payments (same-day
 * void) and the /api/payments/ameria/cancel precondition should be 'paid'.
 *
 *   npx tsx scripts/sandbox-cancel-test.ts --payment <PaymentID>
 */
async function cancelExisting(paymentId: string) {
  console.log(`\n--- Cancelling existing PaymentID ${paymentId} ---`)
  const before = await postJson('GetPaymentDetails', {
    PaymentID: paymentId,
    Username: AMERIA_CLIENT_USR,
    Password: AMERIA_CLIENT_PASS,
  })
  console.log('  GetPaymentDetails (before):', before.status, before.parsed ?? before.text)

  const cancel = await postJson('CancelPayment', {
    PaymentID: paymentId,
    Username: AMERIA_CLIENT_USR,
    Password: AMERIA_CLIENT_PASS,
  })
  console.log('  CancelPayment:', cancel.status, cancel.parsed ?? cancel.text)
  console.log(cancel.parsed?.ResponseCode === '00' ? '  ✓ Cancelled successfully' : '  ✗ Not cancelled')
}

async function main() {
  const payIdx = process.argv.indexOf('--payment')
  if (payIdx >= 0 && process.argv[payIdx + 1]) {
    await cancelExisting(process.argv[payIdx + 1])
    return
  }

  console.log(`Running 5 init+cancel cycles against Ameriabank sandbox (OrderID base ${ORDER_ID_BASE})\n`)
  for (let i = 0; i < 5; i++) {
    await initAndCancel(i)
    await new Promise((r) => setTimeout(r, 1000))
  }
  console.log('\nDone.')
}

main().catch(console.error)
