/* eslint-disable */
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

console.log("==================================================");
console.log("  SnapEvent - Cloudinary Setup & Verification Script  ");
console.log("==================================================");

// 1. Parse .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
console.log(`Reading environment variables from: ${envPath}`);
try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const parts = line.trim().split("=");
      if (parts.length >= 2 && !line.startsWith("#")) {
        const key = parts[0].trim();
        const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        process.env[key] = val;
      }
    });
    console.log("✅ Successfully parsed and loaded .env.local variables.");
  } else {
    console.warn("⚠️  .env.local file not found. Falling back to system process.env.");
  }
} catch (e) {
  console.error("❌ Failed to read .env.local", e);
}

// 2. Configure Cloudinary
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log("\nConfiguring Cloudinary instance with credentials:");
console.log(`- Cloud Name: ${cloudName || "MISSING"}`);
console.log(`- API Key:    ${apiKey ? "PRESENT (hidden)" : "MISSING"}`);
console.log(`- API Secret: ${apiSecret ? "PRESENT (hidden)" : "MISSING"}`);

if (!cloudName || !apiKey || !apiSecret) {
  console.error("\n❌ Error: Missing Cloudinary credentials. Please verify your .env.local file.");
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

// 3. Main execution function
async function run() {
  try {
    // A. Verify connection with ping
    console.log("\n[Step 1] Verifying Cloudinary credentials via API ping...");
    const pingResult = await cloudinary.api.ping();
    console.log("✅ Cloudinary Ping Successful! Response:", pingResult);

    // B. Check / Create upload preset
    const presetName = "snapevent_upload";
    console.log(`\n[Step 2] Checking status of upload preset: '${presetName}'...`);
    let presetExists = false;
    let existingPreset = null;

    try {
      existingPreset = await cloudinary.api.upload_preset(presetName);
      presetExists = true;
      console.log(`- Found existing upload preset: '${presetName}'`);
      console.log(`- Existing preset configuration:`, {
        name: existingPreset.name,
        unsigned: existingPreset.unsigned,
        folder: existingPreset.folder,
      });
    } catch (presetError) {
      if (presetError.message && presetError.message.includes("Can't find upload preset")) {
        console.log(`- Preset '${presetName}' does not exist yet.`);
      } else {
        console.error(`- Encountered error while searching for preset:`, presetError.message);
        throw presetError;
      }
    }

    if (presetExists) {
      // Ensure the existing preset is configured as unsigned
      if (!existingPreset.unsigned) {
        console.log(`\n[Step 3] Updating preset '${presetName}' to be unsigned...`);
        const updateResult = await cloudinary.api.update_upload_preset(presetName, {
          unsigned: true,
          disallow_public_id: false, // Allow client to provide custom folder structure / publicId if needed
        });
        console.log("✅ Successfully updated upload preset to be unsigned. Response:", updateResult);
      } else {
        console.log(`\n[Step 3] Preset '${presetName}' is already unsigned. No updates needed.`);
      }
    } else {
      console.log(`\n[Step 3] Creating new unsigned upload preset: '${presetName}'...`);
      const createResult = await cloudinary.api.create_upload_preset({
        name: presetName,
        unsigned: true,
        disallow_public_id: false, // Keep flexible for our dynamic folder structure
      });
      console.log("✅ Successfully created new unsigned upload preset. Response:", createResult);
    }

    console.log("\n==================================================");
    console.log("🎉 SUCCESS: Cloudinary integration reset complete!");
    console.log("==================================================");
  } catch (error) {
    console.error("\n❌ Setup execution failed!");
    console.error("Exact Error:", error);
    process.exit(1);
  }
}

run();
