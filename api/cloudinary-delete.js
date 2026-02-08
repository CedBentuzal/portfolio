import { v2 as cloudinary } from "cloudinary"

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET
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

export default async function handler(req, res) {
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

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: "Cloudinary config missing" })
    return
  }

  if (!adminEmail || !adminPassword) {
    res.status(500).json({ error: "Admin credentials not configured" })
    return
  }

  const { email, password, publicId, resourceType } = parseBody(req)

  if (email !== adminEmail || password !== adminPassword) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  if (!publicId) {
    res.status(400).json({ error: "publicId is required" })
    return
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })

  const tryDestroy = async (type) => {
    return cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: type,
    })
  }

  try {
    if (resourceType === "video" || resourceType === "image") {
      await tryDestroy(resourceType)
    } else {
      try {
        await tryDestroy("video")
      } catch (error) {
        await tryDestroy("image")
      }
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: error?.message || "Failed to delete asset" })
  }
}
