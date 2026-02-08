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

const parsePortfolioMeta = (publicId = "") => {
  const baseName = publicId.split("/").pop() || publicId
  const parts = baseName.split("__")

  if (parts.length >= 3) {
    const [category, featuredFlag, ...rest] = parts
    return {
      category,
      isFeatured: featuredFlag === "featured",
      restName: rest.join("__") || baseName,
      baseName,
    }
  }

  return {
    category: "motion-saas",
    isFeatured: false,
    restName: baseName,
    baseName,
  }
}

const buildPublicId = (prefix, category, featured, restName) => {
  const featuredFlag = featured ? "featured" : "standard"
  const normalizedPrefix = prefix ? `${prefix}/` : ""
  return `${normalizedPrefix}${category}__${featuredFlag}__${restName}`
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

  const { email, password, category, publicId } = parseBody(req)

  if (email !== adminEmail || password !== adminPassword) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  if (!category || !publicId) {
    res.status(400).json({ error: "Category and publicId are required" })
    return
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })

  const folderPrefix = "portfolio"
  const normalizedPublicId = publicId.includes("/")
    ? publicId
    : `${folderPrefix}/${publicId}`
  const meta = parsePortfolioMeta(normalizedPublicId)
  const prefix = normalizedPublicId.includes("/")
    ? normalizedPublicId.split("/").slice(0, -1).join("/")
    : folderPrefix
  const targetId = buildPublicId(prefix, category, true, meta.restName)

  try {
    const list = await cloudinary.api.resources({
      type: "upload",
      prefix: `${folderPrefix}/`,
      max_results: 500,
    })

    const resources = Array.isArray(list.resources) ? list.resources : []
    const updates = []

    resources.forEach((resource) => {
      const resourceMeta = parsePortfolioMeta(resource.public_id)
      if (resourceMeta.category !== category) {
        return
      }

      if (resourceMeta.isFeatured && resource.public_id !== normalizedPublicId) {
        const resourcePrefix = resource.public_id.includes("/")
          ? resource.public_id.split("/").slice(0, -1).join("/")
          : folderPrefix
        const nextId = buildPublicId(resourcePrefix, category, false, resourceMeta.restName)
        updates.push(
          cloudinary.uploader.rename(resource.public_id, nextId, {
            overwrite: true,
            invalidate: true,
          })
        )
      }
    })

    if (normalizedPublicId !== targetId) {
      updates.push(
        cloudinary.uploader.rename(normalizedPublicId, targetId, {
          overwrite: true,
          invalidate: true,
        })
      )
    }

    await Promise.all(updates)

    res.status(200).json({ ok: true, featuredId: targetId })
  } catch (error) {
    res.status(500).json({
      error: error?.message || "Failed to update highlight",
    })
  }
}
