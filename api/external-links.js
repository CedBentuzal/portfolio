import { getFirestore } from "./firebase.js"

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

const normalizeCategory = (value) => {
  const allowed = ["motion-saas", "shorts", "static-visuals"]
  return allowed.includes(value) ? value : "motion-saas"
}

const normalizeKind = (value) => {
  const allowed = ["youtube", "vimeo", "video", "image"]
  return allowed.includes(value) ? value : "video"
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin(req))
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  res.setHeader("Vary", "Origin")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  const db = getFirestore()

  if (req.method === "GET") {
    try {
      const snapshot = await db.collection("externalLinks").orderBy("createdAt", "desc").get()
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      res.status(200).json({ items })
    } catch (error) {
      res.status(500).json({ error: error?.message || "Failed to load external links" })
    }
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

  const { email, password, action, id, title, url, category, kind } = parseBody(req)

  if (email !== adminEmail || password !== adminPassword) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  try {
    if (action === "delete") {
      if (!id) {
        res.status(400).json({ error: "id is required" })
        return
      }

      await db.collection("externalLinks").doc(id).delete()
      res.status(200).json({ ok: true })
      return
    }

    if (!url) {
      res.status(400).json({ error: "url is required" })
      return
    }

    const payload = {
      title: title || url,
      url,
      category: normalizeCategory(category),
      kind: normalizeKind(kind),
      createdAt: Date.now(),
    }

    const doc = await db.collection("externalLinks").add(payload)
    res.status(200).json({ ok: true, id: doc.id })
  } catch (error) {
    res.status(500).json({ error: error?.message || "Failed to update external links" })
  }
}
