import type { RazorpayCheckoutResponse, RazorpayOrder, User } from '../types'

let scriptLoad: Promise<void> | null = null

export async function prepareRazorpayCheckout() {
  if (window.Razorpay) return
  if (!scriptLoad) {
    scriptLoad = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]')
      const script = existing || document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.dataset.razorpayCheckout = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Unable to load Razorpay Checkout. Check your connection and try again.'))
      if (!existing) document.body.appendChild(script)
    }).catch((error: unknown) => {
      scriptLoad = null
      throw error
    })
  }
  await scriptLoad
  if (!window.Razorpay) throw new Error('Razorpay Checkout did not initialize.')
}

export async function openRazorpayCheckout(
  payment: RazorpayOrder,
  user: User,
): Promise<RazorpayCheckoutResponse> {
  await prepareRazorpayCheckout()
  const Checkout = window.Razorpay
  if (!Checkout) throw new Error('Razorpay Checkout is not available.')

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      action()
    }
    const checkout = new Checkout({
      key: payment.key_id,
      amount: payment.amount,
      currency: payment.currency,
      name: 'BookHub',
      description: `Order #${payment.order_id}`,
      order_id: payment.gateway_order_id,
      prefill: { name: user.full_name, email: user.email, contact: user.phone || undefined },
      method: { card: true, upi: true, netbanking: true },
      handler: (response) => finish(() => resolve(response)),
      modal: { ondismiss: () => finish(() => reject(new Error('Payment window closed before verification.'))) },
    })
    checkout.on('payment.failed', (response) => {
      finish(() => reject(new Error(response.error?.description || 'Razorpay could not complete the payment.')))
    })
    checkout.open()
  })
}
