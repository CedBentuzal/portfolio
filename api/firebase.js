import admin from "firebase-admin"

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT
const projectId = process.env.FIREBASE_PROJECT_ID

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return
  }

  if (!serviceAccountJson && !projectId) {
    throw new Error("Firebase configuration missing")
  }

  if (serviceAccountJson) {
    let serviceAccount
    try {
      serviceAccount = JSON.parse(serviceAccountJson)
    } catch (error) {
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT JSON")
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    return
  }

  admin.initializeApp({
    projectId,
    credential: admin.credential.applicationDefault(),
  })
}

export const getFirestore = () => {
  initializeFirebase()
  return admin.firestore()
}
