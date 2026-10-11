const checkout = document.querySelector('#checkout-dialog');
const checkoutContent = document.querySelector('#checkout-content');
let paymentMethod = 'card';

function checkoutForm() {
  checkoutContent.innerHTML = `<h2>Complete your demo checkout</h2><p class="checkout-subtitle">Choose a payment method to preview the experience.</p>
    <div class="amount-box"><span>Demo purchase</span><strong>₹ 2,499.00</strong></div>
    <div class="method-select" role="tablist" aria-label="Payment method">
      <button class="method-option ${paymentMethod === 'card' ? 'selected' : ''}" data-method="card" role="tab" aria-selected="${paymentMethod === 'card'}"><span>▰</span>Credit / debit card</button>
      <button class="method-option ${paymentMethod === 'upi' ? 'selected' : ''}" data-method="upi" role="tab" aria-selected="${paymentMethod === 'upi'}"><span>U</span>UPI</button>
    </div>
    ${paymentMethod === 'card' ? `<form class="checkout-fields" id="payment-form"><label>Cardholder name<input name="name" autocomplete="off" placeholder="Sample Name" required maxlength="50"></label><label>Card number<input name="number" inputmode="numeric" autocomplete="off" placeholder="4242 4242 4242 4242" required minlength="12" maxlength="23"></label><div class="split-fields"><label>Expiry date<input name="expiry" autocomplete="off" placeholder="MM / YY" required maxlength="7"></label><label>CVV<input name="cvv" inputmode="numeric" autocomplete="off" placeholder="123" required minlength="3" maxlength="4"></label></div><button class="pay-button" type="submit">Pay ₹ 2,499.00 <span>↗</span></button></form>` : `<form class="checkout-fields" id="payment-form"><label>UPI ID<input name="upi" autocomplete="off" placeholder="name@bank" required maxlength="80"></label><p class="upi-help">Enter a sample UPI ID to preview the confirmation step. No request will be sent to a bank or UPI app.</p><button class="pay-button" type="submit">Continue with UPI <span>↗</span></button></form>`}
    <p class="demo-notice">Demo only. Use sample details; never enter real payment information. Nothing is stored or charged.</p>`;
  checkoutContent.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => { paymentMethod = button.dataset.method; checkoutForm(); }));
  checkoutContent.querySelector('#payment-form').addEventListener('submit', event => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('.pay-button');
    submitButton.disabled = true;
    submitButton.textContent = 'Confirming demo…';
    fetch('/api/payments/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Only the demo method is sent; card and UPI fields stay in this browser.
      body: JSON.stringify({ method: paymentMethod }),
    }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not confirm the demo.');
      checkoutContent.innerHTML = `<div class="success-screen"><div class="success-big">✓</div><h2>Demo payment complete</h2><p>Reference ${result.payment.id}. No payment was processed and no card or UPI details were sent or saved.</p><button type="button" id="back-home">Back to Fieldnotes Pay</button></div>`;
      checkoutContent.querySelector('#back-home').addEventListener('click', () => checkout.close());
    }).catch(error => {
      submitButton.disabled = false;
      submitButton.textContent = paymentMethod === 'upi' ? 'Continue with UPI ↗' : 'Pay ₹ 2,499.00 ↗';
      const notice = checkoutContent.querySelector('.demo-notice');
      notice.textContent = error.message || 'Could not confirm the demo. Please try again.';
      notice.classList.add('error');
    });
  });
}

document.querySelectorAll('[data-checkout]').forEach(button => button.addEventListener('click', () => {
  paymentMethod = 'card';
  checkoutForm();
  checkout.showModal();
}));
document.querySelector('.dialog-close').addEventListener('click', () => checkout.close());
checkout.addEventListener('click', event => { if (event.target === checkout) checkout.close(); });
document.querySelector('.menu-toggle').addEventListener('click', event => {
  const nav = document.querySelector('.main-nav');
  const expanded = nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(expanded));
});
document.querySelectorAll('.main-nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelector('.main-nav').classList.remove('open');
  document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
}));

const assistantToggle = document.querySelector('#assistant-toggle');
const assistantPanel = document.querySelector('#assistant-panel');
const assistantForm = document.querySelector('#assistant-form');
const assistantInput = document.querySelector('#assistant-input');
const assistantMessages = document.querySelector('#assistant-messages');
const assistantHistory = [];

fetch('/api/status').then(response => response.json()).then(status => {
  document.querySelector('#assistant-status').textContent = status.aiAvailable ? 'AI assistant · here to help' : 'Preview mode · add an API key for AI';
}).catch(() => {
  document.querySelector('#assistant-status').textContent = 'Assistant is unavailable';
});

assistantToggle.addEventListener('click', () => {
  const open = assistantPanel.classList.toggle('open');
  assistantToggle.setAttribute('aria-expanded', String(open));
  if (open) assistantInput.focus();
});

function addChatMessage(role, content) {
  const bubble = document.createElement('p');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = content;
  assistantMessages.appendChild(bubble);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
  return bubble;
}

assistantForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = assistantInput.value.trim();
  if (!message) return;
  assistantInput.value = '';
  assistantInput.disabled = true;
  assistantForm.querySelector('button').disabled = true;
  addChatMessage('user', message);
  assistantHistory.push({ role: 'user', content: message });
  const pending = addChatMessage('assistant', 'Thinking…');
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: assistantHistory.slice(-8) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not reach the assistant.');
    pending.textContent = result.reply;
    assistantHistory.push({ role: 'assistant', content: result.reply });
  } catch (error) {
    pending.textContent = error.message || 'Could not reach the assistant. Please try again.';
  } finally {
    assistantInput.disabled = false;
    assistantForm.querySelector('button').disabled = false;
    assistantInput.focus();
    assistantMessages.scrollTop = assistantMessages.scrollHeight;
  }
});
