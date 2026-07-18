/* eslint-disable */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");

// Parse .env.local manually
try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  envContent.split("\n").forEach(line => {
    const parts = line.trim().split("=");
    if (parts.length >= 2 && !line.startsWith("#")) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  });
} catch (e) {
  console.error("Failed to read .env.local", e);
}

// 8. Extract publicId from secureUrl helper
function extractPublicId(url) {
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return null;
    
    const path = url.substring(uploadIndex + 8);
    const segments = path.split("/");
    const firstNonTransformIndex = segments.findIndex(seg => seg.match(/^v\d+$/));
    
    let publicIdPath = "";
    if (firstNonTransformIndex !== -1) {
      publicIdPath = segments.slice(firstNonTransformIndex + 1).join("/");
    } else {
      const snapEventIndex = path.indexOf("snapevent/");
      if (snapEventIndex !== -1) {
        publicIdPath = path.substring(snapEventIndex);
      } else {
        const filteredSegments = segments.filter(
          seg => !seg.includes(",") && !seg.startsWith("c_") && !seg.startsWith("w_") && !seg.startsWith("h_")
        );
        if (filteredSegments[0]?.match(/^v\d+$/)) {
          filteredSegments.shift();
        }
        publicIdPath = filteredSegments.join("/");
      }
    }
    
    const dotIndex = publicIdPath.lastIndexOf(".");
    if (dotIndex !== -1) {
      publicIdPath = publicIdPath.substring(0, dotIndex);
    }
    return decodeURIComponent(publicIdPath);
  } catch (error) {
    console.error("Failed to extract publicId:", error);
    return null;
  }
}

// Initialize firebase admin
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"(.*)"$/, "$1") 
  : null;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials in .env.local");
  process.exit(1);
}

const serviceAccount = {
  projectId,
  clientEmail,
  privateKey
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrate() {
  console.log("=== STARTING PORTFOLIO MIGRATION ===");
  try {
    const photographersSnapshot = await db.collection("photographers").get();
    console.log(`Found ${photographersSnapshot.size} photographers.`);

    for (const photographerDoc of photographersSnapshot.docs) {
      const pData = photographerDoc.data();
      const uid = photographerDoc.id;
      console.log(`Processing photographer: ${pData.name || uid}`);

      // 1. Migrate portfolio subcollection
      const portfolioSnapshot = await db.collection("photographers").doc(uid).collection("portfolio").get();
      let subcollectionUpdated = false;

      for (const photoDoc of portfolioSnapshot.docs) {
        const photoData = photoDoc.data();
        const photoId = photoDoc.id;
        
        let publicId = photoData.publicId;
        const secureUrl = photoData.secureUrl || photoData.imageUrl || "";

        if (!publicId && secureUrl) {
          publicId = extractPublicId(secureUrl);
          if (publicId) {
            console.log(`  Updating subcollection photo ${photoId} with publicId: ${publicId}`);
            await db.collection("photographers").doc(uid).collection("portfolio").doc(photoId).update({
              publicId: publicId
            });
            subcollectionUpdated = true;
          }
        }
      }

      // 2. Migrate portfolio / portfolioImages arrays in main photographer doc
      let mainDocUpdated = false;
      const updatedPortfolioArray = [];
      const originalPortfolioArray = pData.portfolio || pData.portfolioImages || [];

      for (const item of originalPortfolioArray) {
        let publicId = item.publicId;
        const secureUrl = item.secureUrl || item.imageUrl || "";

        if (!publicId && secureUrl) {
          publicId = extractPublicId(secureUrl);
          if (publicId) {
            console.log(`  Updating main doc portfolio list item ${secureUrl} with publicId: ${publicId}`);
            item.publicId = publicId;
            mainDocUpdated = true;
          }
        }
        updatedPortfolioArray.push(item);
      }

      if (mainDocUpdated || subcollectionUpdated) {
        console.log(`  Saving migrated arrays for photographer ${uid}...`);
        await db.collection("photographers").doc(uid).update({
          portfolio: updatedPortfolioArray,
          portfolioImages: updatedPortfolioArray
        });
      }
    }

    console.log("=== PORTFOLIO MIGRATION SUCCESS ===");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrate();
