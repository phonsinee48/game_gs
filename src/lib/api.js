const BASE_URL = import.meta.env.VITE_API_BASE_URL
const TOKEN = import.meta.env.VITE_API_TOKEN

export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function randomIdempotencyKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function request(path, { method = 'GET', params, body } = {}) {
  let url = `${BASE_URL}/api/claw_game_api/${path}`
  if (method === 'GET' && params) {
    url += '?' + new URLSearchParams(params).toString()
  }
  const opts = { method, headers: { Authorization: `Bearer ${TOKEN}` } }
  if (method === 'POST') {
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    opts.body = new URLSearchParams(body).toString()
  }

  const res = await fetch(url, opts)
  const json = await res.json()
  if (!json.status) throw new ApiError(json.code, json.message)
  return json.data
}

// Every write call needs its own idempotency_key so a retried request
// (network hiccup, doubled tap) settles on the same result instead of
// spending Point/Ticket/Coin twice.
export const clawGameApi = {
  getGameState(lineID) {
    return request('get_game_state', { params: { lineID } })
  },
  exchangeTicket(lineID, point) {
    return request('exchange_ticket', {
      method: 'POST',
      body: { lineID, point, idempotency_key: randomIdempotencyKey() },
    })
  },
  // Omit playQty to resume a pending_batch left over from an interrupted play.
  playClaw(lineID, playQty) {
    const body = { lineID, idempotency_key: randomIdempotencyKey() }
    if (playQty != null) body.play_qty = playQty
    return request('play_claw', { method: 'POST', body })
  },
  getRedeemList(lineID) {
    return request('get_redeem_list', { params: { lineID } })
  },
  redeemCoin(lineID, redeemId) {
    return request('redeem_coin', {
      method: 'POST',
      body: { lineID, redeem_id: redeemId, idempotency_key: randomIdempotencyKey() },
    })
  },
  getPlayHistory(lineID) {
    return request('get_play_history', { params: { lineID } })
  },
}
