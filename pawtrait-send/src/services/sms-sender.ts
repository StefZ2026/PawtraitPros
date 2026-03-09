// Platform-specific SMS/MMS sending
import { Platform, NativeModules, Linking } from "react-native";
import RNFS from "react-native-fs";
import { QueueMessage, reportStatus } from "./api";

const { SmsSender: NativeSmsSender } = NativeModules;

/** Download image from URL to local temp file */
async function downloadImage(url: string): Promise<string | null> {
  try {
    const filename = `pawtrait_${Date.now()}.jpg`;
    const localPath = `${RNFS.CachesDirectoryPath}/${filename}`;
    const result = await RNFS.downloadFile({
      fromUrl: url,
      toFile: localPath,
    }).promise;
    if (result.statusCode === 200) {
      return localPath;
    }
    return null;
  } catch (err) {
    console.error("[sms-sender] Image download failed:", err);
    return null;
  }
}

/**
 * Send a single message natively from the device.
 *
 * Android: Uses SmsManager via native module — fully automated, no user interaction.
 * iOS: Opens MFMessageComposeViewController — user must tap Send (Apple requirement).
 */
async function sendSingleMessage(msg: QueueMessage): Promise<boolean> {
  try {
    // Download portrait image if available
    let imagePath: string | null = null;
    if (msg.image_url) {
      imagePath = await downloadImage(msg.image_url);
    }

    if (Platform.OS === "android") {
      // Android: send via native module (SmsManager)
      if (NativeSmsSender?.sendMms && imagePath) {
        // MMS with image
        const result = await NativeSmsSender.sendMms(
          msg.recipient_phone,
          msg.message_body,
          imagePath,
        );
        return result?.success === true;
      } else if (NativeSmsSender?.sendSms) {
        // SMS text only (fallback if no image or MMS fails)
        const result = await NativeSmsSender.sendSms(
          msg.recipient_phone,
          msg.message_body,
        );
        return result?.success === true;
      }
      // Final fallback: open native SMS app
      const smsUrl = `sms:${msg.recipient_phone}?body=${encodeURIComponent(msg.message_body)}`;
      await Linking.openURL(smsUrl);
      return true; // Assume success since we opened the app
    }

    if (Platform.OS === "ios") {
      // iOS: Open compose screen pre-filled. Apple doesn't allow silent sending.
      // The native module will present MFMessageComposeViewController with image attachment.
      if (NativeSmsSender?.composeMessage) {
        const result = await NativeSmsSender.composeMessage(
          msg.recipient_phone,
          msg.message_body,
          imagePath, // will be attached to the message
        );
        return result?.sent === true;
      }
      // Fallback: open SMS app via URL (no image attachment possible)
      const smsUrl = `sms:${msg.recipient_phone}&body=${encodeURIComponent(msg.message_body)}`;
      await Linking.openURL(smsUrl);
      return true;
    }

    return false;
  } catch (err) {
    console.error("[sms-sender] Send failed:", err);
    return false;
  }
}

/**
 * Process all messages in the queue.
 * Android: fully automated — sends all without interaction.
 * iOS: presents compose screen for each message sequentially.
 *
 * Reports status back to server for each message.
 */
export async function processQueue(
  messages: QueueMessage[],
  onProgress?: (sent: number, total: number, currentName?: string) => void,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    onProgress?.(sent, messages.length);

    try {
      const success = await sendSingleMessage(msg);
      if (success) {
        sent++;
        await reportStatus(msg.id, "sent");
      } else {
        failed++;
        await reportStatus(msg.id, "failed", "Send cancelled or failed");
      }
    } catch (err: any) {
      failed++;
      await reportStatus(msg.id, "failed", err.message || "Unknown error");
    }

    onProgress?.(sent, messages.length);
  }

  return { sent, failed };
}
