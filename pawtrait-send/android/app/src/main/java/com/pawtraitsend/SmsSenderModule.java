package com.pawtraitsend;

import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.telephony.SmsManager;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import java.io.File;

/**
 * Native module for sending SMS/MMS from the device.
 * Uses Android's SmsManager for text-only SMS.
 * Uses an Intent-based approach for MMS with image attachments.
 */
public class SmsSenderModule extends ReactContextBaseJavaModule {

    SmsSenderModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "SmsSender";
    }

    /**
     * Send a text-only SMS. Fully automated — no UI shown.
     * Requires SEND_SMS permission.
     */
    @ReactMethod
    public void sendSms(String phoneNumber, String message, Promise promise) {
        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                smsManager = getReactApplicationContext().getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }

            // Split long messages
            java.util.ArrayList<String> parts = smsManager.divideMessage(message);
            if (parts.size() > 1) {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            }

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    /**
     * Send MMS with image attachment.
     * Opens the default messaging app with pre-filled content.
     * On most Android devices, this sends without additional user interaction
     * if the default messaging app supports it.
     */
    @ReactMethod
    public void sendMms(String phoneNumber, String message, String imagePath, Promise promise) {
        try {
            Context context = getReactApplicationContext();

            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("image/jpeg");
            intent.putExtra("address", phoneNumber);
            intent.putExtra("sms_body", message);
            intent.putExtra(Intent.EXTRA_TEXT, message);

            // Attach image
            File imageFile = new File(imagePath);
            if (imageFile.exists()) {
                Uri imageUri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    imageFile
                );
                intent.putExtra(Intent.EXTRA_STREAM, imageUri);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Try to use the default SMS app
            String defaultSmsPackage = android.provider.Telephony.Sms.getDefaultSmsPackage(context);
            if (defaultSmsPackage != null) {
                intent.setPackage(defaultSmsPackage);
            }

            context.startActivity(intent);

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }
}
