import { v2 as cloudinary } from "cloudinary"

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET
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

const listResources = async (resourceType) => {
  return cloudinary.api.resources({
    type: "upload",
    prefix: "portfolio/",
    resource_type: resourceType,
    max_results: 100,
  })
}

const mapResource = (resource) => {
  const name = resource.public_id?.split("/").pop() || resource.public_id
  return {
    src: resource.secure_url,
    type: resource.resource_type === "video" ? "video" : "image",
    name,
    publicId: resource.public_id,
    created_at: resource.created_at,
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin(req))
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  res.setHeader("Vary", "Origin")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ error: "Cloudinary config missing" })
    return
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })

  try {
    const [imageResult, videoResult] = await Promise.all([
      listResources("image"),
      listResources("video"),
    ])

    const items = [...(imageResult.resources || []), ...(videoResult.resources || [])]
      .map(mapResource)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    res.status(200).json({ items })
  } catch (error) {
    res.status(500).json({ error: "Failed to list assets" })
  }
}
