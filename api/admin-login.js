const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD
const allowedOrigin = process.env.FRONTEND_ORIGIN || "*"

const getAllowedOrigin = (req) => {
  const allowed = allowedOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
  const requestOrigin = req.headers?.origin

  if (allowed.includes("*")) {
    return "*"
  }

  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin
  }

  return allowed[0] || "*"
}

const parseBody = (req) => {
  if (!req.body) return {}
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin(req))
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  res.setHeader("Vary", "Origin")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  if (!adminEmail || !adminPassword) {
    res.status(500).json({ error: "Admin credentials not configured" })
    return
  }

  const { email, password } = parseBody(req)

  if (email === adminEmail && password === adminPassword) {
    res.status(200).json({ ok: true })
    return
  }

  res.status(401).json({ error: "Unauthorized" })
}
