# Fieldnotes Pay

A responsive payment landing page and interactive checkout preview built with HTML, CSS, JavaScript, and Express.

## Run locally

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm start` for a regular server process.

## Enable AI replies

Copy `.env.example` to `.env`, add your `OPENAI_API_KEY`, then restart the server. The AI support chat uses the OpenAI Responses API. Without a key, the chat stays in preview mode and explains how to enable it. Chat messages may be sent to OpenAI when the key is configured; the server blocks common card-number, UPI-ID, CVV, password, and OTP patterns before forwarding the latest message.

## Backend routes

- `GET /api/status` — reports whether AI is configured and confirms payments are in demo mode
- `POST /api/assistant` — returns an AI payment-help reply (or preview-mode response)
- `POST /api/payments/demo` — records a temporary demo transaction for card or UPI; accepts no payment credentials
- `GET /api/payments/demo` — lists temporary demo transactions

## Demo behavior

The card and UPI forms are frontend previews only. They do not store or send payment details, contact a bank or payment provider, or charge money. Use sample details in the checkout demo. Demo transactions are held in memory and disappear when the server restarts. To accept real payments, integrate a payment provider using its hosted checkout or tokenized client SDK and verify payment results on a server; never handle raw card data in this demo.
