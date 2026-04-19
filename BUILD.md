# How to Install Permanently in Firefox

Firefox requires all extensions to be digitally signed by Mozilla to remain installed after a browser restart. Follow these steps to sign and install your extension for personal use.

## 1. Package the Extension
Run the provided packaging script in your terminal to create a clean ZIP file:

```bash
bash package.sh
```
This will generate a file named `pyload-extension.zip`.

## 2. Submit for Signing (Unlisted)
You do not need to publish the extension to the public store. You can submit it as **Unlisted**.

1. Go to the [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Log in with your Firefox account (or create one).
3. Click **"Submit a New Add-on"**.
4. When asked how you want to distribute, select **"On your own"** (this means "unlisted").
5. Upload the `pyload-extension.zip` file.
6. Mozilla will automatically validate the code.
7. Once validation passes (usually within seconds/minutes), you can download the **signed `.xpi` file** from your developer dashboard.

## 3. Permanent Installation
Once you have the signed `.xpi` file:

1. Open Firefox and go to `about:addons`.
2. Click the **Gear icon** ⚙️ (top right).
3. Select **"Install Add-on From File..."**.
4. Select the `.xpi` file you downloaded from Mozilla.

> [!TIP]
> This version will be permanent and will not disappear when you restart Firefox.

## Maintenance
If you make changes to the code later:
- Re-run `bash package.sh`.
- Upload the new ZIP as a **New Version** on the same product page at AMO.
- Download the new signed `.xpi` and install it.
