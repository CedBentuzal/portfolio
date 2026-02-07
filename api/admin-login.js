const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

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
